import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, RefreshCw, Wallet } from 'lucide-react-native';
import { dbPromise } from '../db/database';
import { syncClientHistory } from '../services/syncService';



const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString.replace(' ', 'T')); // Превращаем в объект даты

    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        // Выводим год только если он НЕ текущий
        year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    });
};

const calculateDebtFromDB = async (clientId: string) => {
    const db = await dbPromise;

    // Получаем сумму всех отгрузок
    const demandRes: any = await db.getFirstAsync(
        'SELECT SUM(sum) as total FROM demands WHERE agent_id = ?', [clientId]
    );

    // Получаем сумму всех оплат
    const paymentRes: any = await db.getFirstAsync(
        'SELECT SUM(sum) as total FROM payments WHERE agent_id = ?', [clientId]
    );

    const totalDemands = demandRes?.total || 0;
    const totalPayments = paymentRes?.total || 0;

    // Возвращаем разницу
    return totalDemands - totalPayments;
};

interface MSDocument {
    id: string;
    name: string;
    sum: number;
    payedSum?: number; // Опционально, так как в payments его может не быть
    moment: string;
    agent_id: string;
}

const getSumColor = (item: MSDocument, activeTab: string): string => {
    if (activeTab === 'payments') return 'text-green-600';

    const total = item.sum || 0;
    const payed = item.payedSum || 0;

    if (payed <= 0) return 'text-red-600';
    if (payed < total) return 'text-amber-500';
    return 'text-green-600';
};

export const ClientDetailScreen = ({ client, onBack, onSelectOrder }: any) => {
    const [activeTab, setActiveTab] = useState('orders'); // orders, demands, payments
    const [data, setData] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [currentDebt, setCurrentDebt] = useState(0); // Изначально 0

    // Загрузка из локальной БД
    const loadLocalData = async () => {
        const db = await dbPromise;

        // 1. Считаем долг на основе имеющихся в базе документов
        const calculated = await calculateDebtFromDB(client.id);
        setCurrentDebt(calculated);


        const rows = await db.getAllAsync(
            `SELECT * FROM ${activeTab} WHERE agent_id = ? ORDER BY moment DESC`,
            [client.id]
        );
        setData(rows);
    };

    // Ручная синхронизация
    const handleSync = async () => {
        setIsSyncing(true);
        const success = await syncClientHistory(client.id);
        if (success) await loadLocalData();
        if (success) {
            // После загрузки новых документов пересчитываем долг
            await loadLocalData();
        }
        setIsSyncing(false);
    };

    useEffect(() => { loadLocalData(); }, [activeTab]);

    return (
        <View className="flex-1 bg-white">
            {/* HEADER */}
            <View className="px-5 pb-3 bg-blue-600 rounded-b-[12px]">
                <View className="flex-row justify-between items-center mb-1">
                    <TouchableOpacity onPress={onBack}>
                        <ArrowLeft color="white" size={26} />
                    </TouchableOpacity>

                    {/* КНОПКА СИНХРОНИЗАЦИИ РЯДОМ С ИМЕНЕМ */}
                    <TouchableOpacity
                        onPress={handleSync}
                        disabled={isSyncing}
                        className="bg-white/20 p-2 rounded-full"
                    >
                        {isSyncing ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <RefreshCw color="white" size={20} />
                        )}
                    </TouchableOpacity>
                </View>

                <Text className="text-white text-2xl font-black mb-1">{client.name}</Text>
                <View className="flex-row items-center">
                    <Wallet size={16} color="#bfdbfe" />
                    <Text className="text-blue-100 ml-2 font-bold">Долг: {(currentDebt / 100).toLocaleString('ru-RU')} ₽</Text>
                </View>
            </View>

            {/* ТАБЫ (orders, demands, payments) */}
            <View className="flex-row justify-around border-b border-gray-100">
                {['orders', 'demands', 'payments'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        className={`py-4 px-6 ${activeTab === tab ? 'border-b-2 border-blue-600' : ''}`}
                    >
                        <Text className={`font-bold ${activeTab === tab ? 'text-blue-600' : 'text-gray-400'}`}>
                            {tab === 'orders' ? 'Заказы' : tab === 'demands' ? 'Отгрузки' : 'Оплаты'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={data}
                keyExtractor={(item: MSDocument) => item.id} // Типизируем здесь
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }: { item: MSDocument }) => { // И здесь
                    const sumColorClass = getSumColor(item, activeTab);

                    return (
                        <TouchableOpacity
                            onPress={() => onSelectOrder(item, activeTab)}
                            className="bg-gray-50 p-4 rounded-2xl mb-3 border border-gray-100"
                        >
                            <View className="flex-row justify-between">
                                <Text className="font-bold text-gray-800">{item.name}</Text>
                                <Text className={`font-black ${sumColorClass}`}>
                                    {(item.sum / 100).toLocaleString('ru-RU')} ₽
                                </Text>
                            </View>
                            <Text className="text-[10px] text-gray-400 mt-1">{formatDate(item.moment)}</Text>
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View className="mt-10 items-center">
                        <Text className="text-gray-400">Нет данных в базе.</Text>
                        <Text className="text-blue-600 mt-2 font-bold" onPress={handleSync}>Нажми обновить</Text>
                    </View>
                }
            />
        </View>
    );
};