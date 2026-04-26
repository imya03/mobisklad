import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dbPromise } from '../db/database';
import { Product } from '../types/index';
import { Paths, File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

// --- КОНСТАНТЫ ---
export const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2';

export const getMSConfig = async () => {
  const token = await SecureStore.getItemAsync('user_api_key');
  const storeId = await SecureStore.getItemAsync('store_id');
  const orgId = await SecureStore.getItemAsync('org_id');

  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    storeId,
    orgId
  };
};
let cachedConfig: any = null;

export const getConfig = async () => {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await getMSConfig();
  return cachedConfig;
};
const LAST_SYNC_KEY = 'last_moysklad_sync';

let isDbLockedBySync = false;


// --- ТИПЫ ---
export type SyncProgress = {
  step: string;
  count: number;
  total?: number;
};

interface MSImageRow {
  meta: { downloadPermanentHref?: string };
}





/**
 * Вспомогательная функция для параллельных запросов
 */
const fetchParallel = async (
  endpoint: string,
  total: number,
  limit: number,
  params: any,
  onBatch: (rows: any[]) => Promise<void>
) => {
  const CONCURRENCY = 5; // Оптимально для МойСклад (3-5)
  const config = await getConfig();
  for (let offset = 0; offset < total; offset += limit * CONCURRENCY) {
    const promises = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const currentOffset = offset + (i * limit);
      if (currentOffset >= total) break;

      promises.push(
        axios.get(`${BASE_URL}/${endpoint}`, {
          headers: config.headers,
          params: { ...params, limit, offset: currentOffset }
        })
      );
    }
    const results = await Promise.all(promises);
    for (const res of results) {
      await onBatch(res.data.rows || []);
    }
  }
};

export const syncChangesOnly = async (onProgress?: (p: SyncProgress) => void) => {
  if (isDbLockedBySync) return false;
  isDbLockedBySync = true;

  const db = await dbPromise;
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');

  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    console.log(`🚀 Ускоренная синхронизация. Метка: ${lastSync || 'Полная'}`);

    // --- 1. ОСТАТКИ (ПАРАЛЛЕЛЬНО) ---
    const allStocks = new Map<string, number>();
    const config = await getConfig();
    const stockInit = await axios.get(`${BASE_URL}/report/stock/all?limit=1`, { headers: config.headers });
    const totalStocks = stockInit.data.meta.size;

    await fetchParallel('report/stock/all', totalStocks, 1000, { t: Date.now() }, async (rows) => {
      rows.forEach((s: any) => {
        const id = s.meta.href.split('?')[0].split('/').pop();
        if (id) allStocks.set(id, s.stock);
      });
    });
    if (onProgress) {
      onProgress({
        step: 'Остатки загружены',
        count: allStocks.size
      });
    }

    // Быстрое обновление остатков в БД
    await db.withTransactionAsync(async () => {
      for (const [id, stock] of allStocks) {
        await db.runAsync('UPDATE products SET stock = ? WHERE id = ?', [stock, id]);
      }
    });

    // 2. КАТЕГОРИИ
    if (onProgress) onProgress({ step: 'Обновление категорий...', count: 0 });
    const remoteCatIds = new Set<string>();
    let cOffset = 0;
    while (true) {
      const filter = lastSync ? `&filter=updated>=${encodeURIComponent(lastSync)}` : '';
      const res = await axios.get(`${BASE_URL}/entity/productfolder?limit=1000&offset=${cOffset}${filter}`, { headers: config.headers });
      const rows = res.data.rows || [];
      await db.withTransactionAsync(async () => {
        for (const cat of rows) {
          remoteCatIds.add(cat.id);
          const parentId = cat.productFolder?.meta?.href.split('/').pop() || null;
          await db.runAsync('INSERT OR REPLACE INTO categories (id, name, parentId) VALUES (?, ?, ?)', [cat.id, cat.name, parentId]);
        }
      });
      if (rows.length < 1000) break;
      cOffset += 1000;
    }




    // --- 3. ТОВАРЫ (ПАРАЛЛЕЛЬНО) ---
    if (onProgress) onProgress({ step: 'Загрузка товаров...', count: 0 });
    const remoteProductIds = new Set<string>();
    let updatedCount = 0;
    let maxUpdatedInResponse = lastSync || '';

    // Узнаем, сколько товаров нужно загрузить с учетом фильтра
    const productParams = {
      limit: 1000,
      ...(lastSync ? { filter: `updated>=${lastSync}` } : {}),
      t: Date.now()
    };

    const prodInit = await axios.get(`${BASE_URL}/entity/product`, {
      headers: config.headers,
      params: { ...productParams, limit: 1 }
    });
    const totalProducts = prodInit.data.meta.size;

    console.log(`📦 Всего товаров к обработке: ${totalProducts}`);

    await fetchParallel('entity/product', totalProducts, 1000, productParams, async (rows) => {
      await db.withTransactionAsync(async () => {
        for (const p of rows) {
          remoteProductIds.add(p.id);

          const catId = p.productFolder?.meta?.href.split('/').pop() || null;
          const price = p.salePrices?.[0]?.value ? p.salePrices[0].value / 100 : 0;
          const stock = allStocks.get(p.id) || 0;

          await db.runAsync(
            `INSERT INTO products (id, name, article, barcode, price, stock, catId, img, updated, local_image_uri) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT local_image_uri FROM products WHERE id = ?))
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                article = excluded.article,
                barcode = excluded.barcode,
                price = excluded.price,
                stock = excluded.stock,
                catId = excluded.catId,
                updated = excluded.updated
                -- МЫ НЕ ТРОГАЕМ колонки img и local_image_uri при обновлении!
              `,
            [p.id, p.name, p.article || '', p.barcodes?.[0]?.value || '', price, stock, catId, null, p.updated, p.id]
          );
          updatedCount++;
        }
      });
      if (onProgress) onProgress({ step: 'Загрузка товаров...', count: updatedCount });
    });





    // --- 4. АУДИТ УДАЛЕНИЙ
    if (lastSync) {
      const auditFilter = encodeURIComponent(`entityType=product;eventType=delete;moment>=${lastSync}`);
      const auditRes = await axios.get(`${BASE_URL}/audit?filter=${auditFilter}`, { headers: config.headers });
      const auditRows = auditRes.data.rows || [];
      for (const a of auditRows) {
        const deletedId = a.objectHref?.split('/').pop()?.split('?')[0];
        if (deletedId) await db.runAsync('DELETE FROM products WHERE id = ?', [deletedId]);
      }
    }

    // 4. ОЧИСТКА (только при полной синхронизации)
    if (!lastSync) {
      const localProducts = await db.getAllAsync('SELECT id FROM products') as { id: string }[];
      await db.withTransactionAsync(async () => {
        for (const lp of localProducts) {
          if (!remoteProductIds.has(lp.id)) await db.runAsync('DELETE FROM products WHERE id = ?', [lp.id]);
        }
      });
    }

    // --- 5. ОБНОВЛЕНИЕ МЕТКИ ---
    const now = new Date();
    const mskOffset = 3 * 60 * 60 * 1000; // 3 часа в миллисекундах
    const mskDate = new Date(now.getTime() + mskOffset);

    // Форматируем в строку: YYYY-MM-DD HH:mm:ss.SSS
    const nextSync = mskDate.toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .slice(0, 23);

    console.log(`✅ Синхронизация завершена. Новая метка (МСК): ${nextSync}`);
    await AsyncStorage.setItem(LAST_SYNC_KEY, nextSync);
  } catch (e: any) {
    console.error('🔴 Sync Error:', e.message);
    return false;
  } finally {
    isDbLockedBySync = false;
  }
};


/**
 * Поштучная загрузка изображений
 */
export const syncAllImagesOneByOne = async (
  onProgress?: (current: number, total: number, message: string) => void,
  signal?: AbortSignal
) => {
  const db = await dbPromise;

  // 1. Берем товары, у которых нет локальной картинки. 
  // Добавляем 'article', чтобы выводить его в консоль.
  const productsToSync = await db.getAllAsync<{ id: string, article: string }>(
    "SELECT id, article FROM products WHERE (local_image_uri IS NULL OR local_image_uri = '')"
  );

  const globalTotal = productsToSync.length;
  console.log(`🔎 Проверка изображений для ${globalTotal} товаров...`);

  if (globalTotal === 0) {
    console.log("✅ Все фото уже загружены или отсутствуют в МойСклад.");
    return;
  }

  for (let i = 0; i < globalTotal; i++) {
    if (signal?.aborted) return;
    const p = productsToSync[i];
    const art = p.article || 'Без артикула';
    let status = "";

    try {
      // ШАГ А: Запрос ссылки
      const config = await getConfig();
      const res = await axios.get(`${BASE_URL}/entity/product/${p.id}/images`, {
        headers: config.headers,
        params: { fields: 'downloadPermanentHref' },
        signal: signal
      });

      const permUrl = res.data.rows?.[0]?.meta?.downloadPermanentHref;

      if (permUrl) {
        // ШАГ Б: Загрузка
        const imgRes = await fetch(permUrl);
        if (!imgRes.ok) throw new Error('Ошибка сети');

        const buffer = await imgRes.arrayBuffer();
        const fileUri = `${Paths.document.uri}img_${p.id}.jpg`;
        const imageFile = new File(fileUri);
        await imageFile.write(new Uint8Array(buffer));

        // ШАГ В: БД
        await db.runAsync('UPDATE products SET local_image_uri = ? WHERE id = ?', [fileUri, p.id]);
        status = "✅ ЗАГРУЖЕНО";
      } else {
        await db.runAsync("UPDATE products SET local_image_uri = 'no_image' WHERE id = ?", [p.id]);
        status = "❌";
      }

    } catch (e: any) {
      if (axios.isCancel(e)) break;
      if (e.response?.status === 429) {
        console.log("⏳ Лимит API (429). Пауза 5 сек...");
        await new Promise(r => setTimeout(r, 5000));
        i--;
        continue;
      }
      status = `⚠️ ОШИБКА: ${e.message}`;
    }

    // Вывод в консоль в нужном формате
    console.log(`[${i + 1}/${globalTotal}] Артикул: ${art} | Статус: ${status}`);

    // Обновление прогресс-бара в UI
    if (onProgress) {
      const artStatus = `Арт: ${art} — ${status}`
      onProgress(i + 1, globalTotal, artStatus);
    }

    // Небольшая пауза, чтобы не забивать поток
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 50));
  }

  console.log("🏁 Процесс синхронизации фото завершен.");
};

/**
 * Создание заказа
 */
export const createOrderInMoySklad = async (clientId: string, cart: Record<string, number>, products: Product[]) => {
  const positions = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(prod => prod.id === id);
    return {
      quantity: qty,
      reserve: qty,
      price: Math.round((p?.price || 0) * 100),
      assortment: { meta: { href: `${BASE_URL}/entity/product/${id}`, type: 'product', mediaType: 'application/json' } }
    };
  });
  const config = await getConfig();
  const body = {
    organization: { meta: { href: `${BASE_URL}/entity/organization/${config.orgId}`, type: 'organization', mediaType: 'application/json' } },
    agent: { meta: { href: `${BASE_URL}/entity/counterparty/${clientId}`, type: 'counterparty', mediaType: 'application/json' } },
    store: { meta: { href: `${BASE_URL}/entity/store/${config.storeId}`, type: 'store', mediaType: 'application/json' } },
    positions
  };

  const response = await axios.post(`${BASE_URL}/entity/customerorder`, body, { headers: config.headers });
  return response.data;
};


/**
 * СИНХРОНИЗАЦИЯ КОНТРАГЕНТОВ
 */
export const syncClients = async () => { // Проверь наличие слова export
  if (isDbLockedBySync) return false;
  isDbLockedBySync = true;

  const db = await dbPromise;

  try {
    console.log('📡 [START] Загрузка контрагентов...');

    // Используем /entity/counterparty
    const url = `${BASE_URL}/entity/counterparty?limit=1000&expand=accounts`;
    const config = await getConfig();
    const res = await axios.get(url, { headers: config.headers });
    const rows = res.data.rows || [];

    await db.withTransactionAsync(async () => {
      for (const c of rows) {
        const address = c.actualAddress || c.legalAddress || '';
        await db.runAsync(
          `INSERT OR REPLACE INTO clients (id, name, address, debt) 
           VALUES (?, ?, ?, ?)`,
          [c.id, c.name, address, 0]
        );
      }
    });

    console.log(`✅ Загружено: ${rows.length} клиентов`);
    return true;
  } catch (e: any) {
    console.error('🔴 Ошибка клиентов:', e.message);
    return false;
  } finally {
    isDbLockedBySync = false;
  }
};






export const syncClientHistory = async (clientId: string) => {
  const db = await dbPromise;
  const types = [
    { endpoint: 'customerorder', table: 'orders' },
    { endpoint: 'demand', table: 'demands' },
    { endpoint: 'paymentin', table: 'payments' }
  ];

  try {
    const config = await getConfig();
    // 1. Загружаем только списки документов (без expand позиций)
    const results = await Promise.all(

      types.map(item => {
        const url = `${BASE_URL}/entity/${item.endpoint}`;
        // Фильтруем документы только по конкретному контрагенту
        const filter = `filter=agent=${BASE_URL}/entity/counterparty/${clientId}`;

        const finalUrl = `${url}?${filter}`;
        console.log(`📡 Загрузка списка для ${item.table}...`);

        return axios.get(finalUrl, { headers: config.headers });
      })
    );

    // 2. Записываем данные в локальную БД
    await db.withTransactionAsync(async () => {
      for (let i = 0; i < types.length; i++) {
        const { table } = types[i];
        const rows = results[i].data.rows || [];

        // Очищаем старые записи этого клиента в текущей таблице
        await db.runAsync(`DELETE FROM ${table} WHERE agent_id = ?`, [clientId]);

        for (const doc of rows) {
          // Специальная логика для платежей (пропускаем авансы без связей)
          let currentPayedSum = 0;

          if (table === 'payments') {
            // Для платежей оплаченная сумма равна сумме документа
            currentPayedSum = doc.sum;
          } else {
            // Для заказов и отгрузок берем специальное поле из МойСклад
            currentPayedSum = doc.payedSum || 0;
          }

          // Сохраняем "шапку" документа
          await db.runAsync(
            `INSERT OR REPLACE INTO ${table} (id, agent_id, name, sum, payedSum, moment) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              doc.id,
              clientId,
              doc.name || 'Без названия',
              doc.sum,
              doc.payedSum || 0, // Берем из API или 0, если поля нет
              doc.moment
            ]
          );
        }
      }
    });

    console.log(`✅ Базовая история клиента ${clientId} обновлена`);
    return true;
  } catch (e: any) {
    console.error("🔴 Ошибка синхронизации истории:", e.message);
    return false;
  }
};



export const saveOptimisticOrder = async (clientId: string, orderData: any) => {
  const db = await dbPromise;
  try {
    // Формируем объект так же, как это делает syncClientHistory
    await db.runAsync(
      `INSERT OR REPLACE INTO orders (id, agent_id, name, sum, payedSum, moment) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        orderData.id || `temp-${Date.now()}`, // Используем ID от МойСклад или временный
        clientId,
        orderData.name || 'Новый заказ (обработка...)',
        orderData.sum,
        0, // Оплачено пока 0
        new Date().toISOString().replace('T', ' ').substring(0, 19) // Формат даты для БД
      ]
    );
    console.log("💾 Заказ оптимистично сохранен в локальную БД");
    return true;
  } catch (e) {
    console.error("🔴 Ошибка сохранения в БД:", e);
    return false;
  }
};