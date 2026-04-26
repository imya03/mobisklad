import React, { useState, useEffect, useCallback } from 'react';
import { OrderDetailScreen } from './src/screens/OrderDetailScreen';
import axios from 'axios'; // для запроса позиций
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { saveOptimisticOrder } from './src/services/syncService';
// Иконки
import {
    Users,
    LayoutGrid,
    ShoppingCart,
    Settings,
} from 'lucide-react-native';
import { BackHandler } from 'react-native';
// Экраны
import { ClientsScreen } from './src/screens/ClientsScreen';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { CartScreen } from './src/screens/CartScreen';
import { ClientDetailScreen } from './src/screens/ClientDetailScreen';
// Компоненты
import { NavBtn } from './src/components/NavBtn';
import { SettingsScreen } from './src/screens/Settings';
// Типы
import { Client, Product, Category, OrderDetails } from './src/types/index';

// База данных и Сервисы
import {
    initDB,
    dbPromise
} from './src/db/database';

import {
    getConfig,
    BASE_URL,
    createOrderInMoySklad
} from './src/services/syncService';


export default function MainApp() {
    const [activeTab, setActiveTab] = useState('clients');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [cart, setCart] = useState<Record<string, number>>({});
    const [clients, setClients] = useState<Client[]>([]);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
    const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Загрузка данных из SQLite в стейт
    const loadDataFromDb = useCallback(async () => {
        try {
            const db = await dbPromise;
            // Загружаем всё параллельно для скорости
            const [prodRows, catRows, clientRows] = await Promise.all([
                db.getAllAsync('SELECT * FROM products'),
                db.getAllAsync('SELECT * FROM categories'),
                db.getAllAsync('SELECT * FROM clients ORDER BY name ASC')
            ]);

            setProducts(prodRows as Product[]);
            setCategories(catRows as Category[]);
            setClients(clientRows as Client[]);

            console.log(`✅ Данные обновлены в Appp: ${prodRows.length} товаров`);
        } catch (e) {
            console.error("Ошибка загрузки из БД:", e);
        }
    }, []);

    // Инициализация при запуске
    useEffect(() => {
        const setup = async () => {
            await initDB();
            await loadDataFromDb();
            // await syncClients(); // Вызываем созданную ранее функцию
        };
        setup();
    }, []);


    useEffect(() => {
        const backAction = () => {
            // 1. Если открыты детали заказа
            if (selectedOrder) {
                setSelectedOrder(null);
                return true; // "true" значит, что мы сами обработали нажатие
            }

            // 2. Если открыты детали клиента
            if (isDetailOpen) {
                setIsDetailOpen(false);
                return true;
            }
            if (isSyncModalVisible) {
                setIsSyncModalVisible(false);
                return true;
            }

            // 3. Если мы в корзине или каталоге, но хотим вернуться на вкладку клиентов
            if (activeTab !== 'catalog') {
                setActiveTab('catalog');
                return true;
            }

            // Если мы и так на главном экране (clients), возвращаем false.
            // Приложение закроется как обычно.
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        // Не забываем удалять слушатель при размонтировании компонента
        return () => backHandler.remove();
    }, [selectedOrder, isDetailOpen, activeTab, isSyncModalVisible]); // Важно: следим за этими стейтами



    // --- ЛОГИКА КОРЗИНЫ ---

    const updateCart = (productId: string, newAmount: number) => {
        setCart(prev => {
            // Если новое число 0 или меньше — удаляем товар из корзины
            if (newAmount <= 0) {
                const newCart = { ...prev };
                delete newCart[productId];
                return newCart;
            }
            // В противном случае просто записываем новое число (заменяя старое)
            return {
                ...prev,
                [productId]: newAmount
            };
        });
    };

    const handleCheckout = async () => {
        // 1. Проверки перед отправкой
        if (!selectedClient) {
            alert('Сначала выберите клиента');
            return;
        }

        if (Object.keys(cart).length === 0) {
            alert('Корзина пуста');
            return;
        }

        setIsLoading(true);

        try {
            // 2. Вызываем API, передавая данные из текущего стейта App.tsx
            // Мы передаем: ID клиента, объект корзины и весь массив продуктов (для цен)
            const response = await createOrderInMoySklad(selectedClient.id, cart, products);

            if (response.status === 200 || response.status === 201) {
                const serverOrder = response.data;

                // 2. ОПТИМИСТИЧНАЯ ЗАПИСЬ В БД
                // Сразу пишем в таблицу orders, чтобы UI, который читает из БД, увидел заказ
                await saveOptimisticOrder(selectedClient.id, {
                    id: serverOrder.id,
                    name: serverOrder.name,
                    sum: serverOrder.sum,
                });
            }

            // 3. Если всё успешно
            alert('✅ Заказ успешно создан в МоемСкладе!');
            setCart({}); // Очищаем корзину в стейте App.tsx
        } catch (error: any) {
            // Выводим ошибку для отладки
            console.error('Ошибка при чекауте:', error.response?.data || error.message);
            alert('❌ Не удалось создать заказ. Проверьте консоль.');
        } finally {
            setIsLoading(false);
        }
    };


    const handleOpenOrderDetails = async (doc: any, type: string) => {
        const db = await dbPromise;
        setIsLoading(true); // Покажем спиннер, если загрузка из сети

        try {
            const config = await getConfig();
            // 1. Пытаемся найти товары в локальной БД
            let localItems = await db.getAllAsync(
                'SELECT * FROM order_items WHERE order_id = ?',
                [doc.id]
            ) as any[];

            // 2. Если в БД пусто — тянем из API один раз
            if (localItems.length === 0) {
                console.log(`☁️ Загрузка позиций из API для ${doc.name}...`);

                // Определяем эндпоинт в зависимости от типа (заказ или отгрузка)
                const endpoint = type === 'orders' ? 'customerorder' : 'demand';

                const response = await axios.get(
                    `${BASE_URL}/entity/${endpoint}/${doc.id}/positions?expand=assortment`,
                    { headers: config.headers }
                );

                const apiPositions = response.data.rows || [];

                // Сохраняем их в БД
                for (const pos of apiPositions) {
                    await db.runAsync(
                        `INSERT OR REPLACE INTO order_items (id, order_id, name, quantity, price) VALUES (?, ?, ?, ?, ?)`,
                        [pos.id, doc.id, pos.assortment?.name || 'Товар', pos.quantity, pos.price]
                    );
                }

                // Перезапрашиваем из БД после вставки
                localItems = await db.getAllAsync('SELECT * FROM order_items WHERE order_id = ?', [doc.id]) as any[];
            }

            // 3. Открываем экран с данными
            setSelectedOrder({
                name: doc.name,
                moment: doc.moment,
                agentName: selectedClient?.name || 'Клиент',
                sum: doc.sum,
                positions: localItems.map(p => ({
                    id: p.id,
                    name: p.name,
                    quantity: p.quantity,
                    price: p.price,
                }))
            });

        } catch (error: any) {
            console.error("Ошибка загрузки состава:", error.message);
            alert("Не удалось загрузить состав заказа");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#2563eb]" edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

            {/* Content */}
            <View className="flex-1 bg-white overflow-hidden">
                {/* УСЛОВИЕ ДЕТАЛЕЙ ЗАКАЗА (Перекрывает контент) */}
                {selectedOrder ? (
                    <OrderDetailScreen
                        order={selectedOrder}
                        onBack={() => setSelectedOrder(null)}
                    />
                ) : (
                    /* ОСНОВНЫЕ ЭКРАНЫ */
                    <>
                        {activeTab === 'clients' && (
                            <>
                                {isDetailOpen && selectedClient ? (
                                    <ClientDetailScreen
                                        client={selectedClient}
                                        onBack={() => { setIsDetailOpen(false); setSelectedClient(null) }}
                                        // ПРОБРАСЫВАЕМ ФУНКЦИЮ ОТКРЫТИЯ ДЕТАЛЕЙ
                                        onSelectOrder={(doc: any, type: string) => handleOpenOrderDetails(doc, type)}
                                        BASE_URL={BASE_URL}
                                    />
                                ) : (
                                    <ClientsScreen
                                        clients={clients}
                                        selectedClientId={selectedClient?.id}
                                        onSelect={(client) => {
                                            setSelectedClient(client);
                                            setIsDetailOpen(true);
                                        }}
                                    />
                                )}
                            </>
                        )}

                        {activeTab === 'catalog' && (
                            <CatalogScreen
                                products={products}
                                categories={categories}
                                cart={cart}
                                onUpdateCart={updateCart}
                                expandedFolders={expandedFolders}
                                onToggleFolder={(id: string) => setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }))}
                            />
                        )}

                        {activeTab === 'cart' && (
                            <CartScreen
                                cart={cart}
                                products={products}
                                client={selectedClient}
                                onUpdateCart={updateCart}
                                onCheckout={handleCheckout}
                                isLoading={isLoading}
                            />
                        )}

                        {activeTab === 'settings' && (
                            <SettingsScreen onDataUpdate={loadDataFromDb}/>
                        )}
                    </>
                )}
            </View>
            {/* НИЖНЯЯ НАВИГАЦИЯ (Всегда видна, если не открыт заказ) */}
            {!selectedOrder && (
                <View className="h-20 bg-white flex-row border-t border-[#f3f4f6] pb-5">
                    <NavBtn
                        active={activeTab === 'clients'}
                        icon={<Users size={22} color={activeTab === 'clients' ? "#2563eb" : "#9ca3af"} />}
                        label="Клиенты"
                        onPress={() => setActiveTab('clients')}
                    />
                    <NavBtn
                        active={activeTab === 'catalog'}
                        icon={<LayoutGrid size={22} color={activeTab === 'catalog' ? "#2563eb" : "#9ca3af"} />}
                        label="Каталог"
                        onPress={() => setActiveTab('catalog')}
                    />
                    <NavBtn
                        active={activeTab === 'cart'}
                        icon={<ShoppingCart size={22} color={activeTab === 'cart' ? "#2563eb" : "#9ca3af"} />}
                        label="Корзина"
                        onPress={() => setActiveTab('cart')}
                        badge={Object.keys(cart).length}
                    />
                    <NavBtn
                        active={activeTab === 'orders'}
                        icon={<Settings size={22} color={activeTab === 'orders' ? "#2563eb" : "#9ca3af"} />}
                        label="Синхронизация"
                        onPress={() => { setActiveTab('settings'); setIsSyncModalVisible(true) }}

                    />
                </View>
            )}
        </SafeAreaView>
    );
}