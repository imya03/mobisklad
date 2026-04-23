import * as SQLite from 'expo-sqlite';

export const dbPromise = SQLite.openDatabaseAsync('moysklad.db');


export const initDB = async () => {

  const db = await dbPromise;

  // 1. Настройка производительности и блокировок
  // busy_timeout — ждать 5 сек если база занята
  // journal_mode = WAL — разрешает чтение во время записи
  await db.execAsync(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
  `);

  // 2. Создание всех таблиц одним блоком
  // Добавил индексы для ускорения поиска по категориям и агентам
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      parentId TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    article TEXT,
    barcode TEXT,
    price REAL,
    stock INTEGER DEFAULT 0,
    catId TEXT,
    img TEXT,               -- Это будет наш imageHref (ссылка из API)
    supplier TEXT,
    updated TEXT,
    local_image_uri TEXT    -- НОВАЯ КОЛОНКА для пути к файлу
  );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT,
      address TEXT,
      debt REAL DEFAULT 0,
      updated TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, 
      agent_id TEXT, 
      name TEXT, 
      sum REAL, 
      payedSum REAL DEFAULT 0,
      moment TEXT
    );

    CREATE TABLE IF NOT EXISTS demands (
      id TEXT PRIMARY KEY, 
      agent_id TEXT, 
      name TEXT, 
      sum REAL, 
      payedSum REAL DEFAULT 0,
      moment TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, 
      agent_id TEXT, 
      name TEXT, 
      sum REAL, 
      payedSum REAL DEFAULT 0,
      moment TEXT
    );

    -- Индексы для ускорения работы (особенно важно для истории клиента)
    CREATE INDEX IF NOT EXISTS idx_products_cat ON products(catId);
    CREATE INDEX IF NOT EXISTS idx_orders_agent ON orders(agent_id);
    CREATE INDEX IF NOT EXISTS idx_demands_agent ON demands(agent_id);
    CREATE INDEX IF NOT EXISTS idx_payments_agent ON payments(agent_id);
  `);
  try {
    await db.execAsync(`ALTER TABLE products ADD COLUMN local_image_uri TEXT;`);
    console.log("✅ Колонка local_image_uri добавлена");
  } catch (e) {
    // Если колонка уже есть, SQLite выдаст ошибку, мы её просто игнорируем
  }



  await db.execAsync(`
  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT,      -- ID заказа или отгрузки из таблиц orders/demands
    name TEXT,          -- Название товара
    quantity REAL,      -- Количество
    price INTEGER,      -- Цена в копейках
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
  );
`);

  console.log("🗄️ База данных инициализирована (WAL mode)");
};
