import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Database, CloudSync, ChevronRight, Bell, ShieldCheck, Info } from 'lucide-react-native';
// Предполагаем, что SyncModal лежит в компонентах
import { SyncModal } from '../components/SyncModal';

export const SettingsScreen = ({onDataUpdate} : any) => {
    const [isSyncModalVisible, setSyncModalVisible] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const renderSettingItem = (icon: any, title: string, subtitle: string, onPress?: () => void, rightElement?: any) => (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            className="flex-row items-center bg-white p-4 mb-[1px]"
        >
            <View className="bg-blue-50 p-2 rounded-lg mr-4">
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-medium text-base">{title}</Text>
                <Text className="text-gray-500 text-xs">{subtitle}</Text>
            </View>
            {rightElement ? rightElement : <ChevronRight size={20} color="#9ca3af" />}
        </TouchableOpacity>
    );

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6 pt-12">
                <Text className="text-3xl font-bold text-gray-900">Настройки</Text>
            </View>

            {/* Секция: Данные и Синхронизация */}
            <View className="mb-6">
                <Text className="px-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Данные</Text>
                <View className="border-t border-b border-gray-100">
                    {renderSettingItem(
                        <CloudSync size={22} color="#2563eb" />,
                        "Синхронизация",
                        "Обновить товары и остатки из МойСклад",
                        () => setSyncModalVisible(true)
                    )}
                    {renderSettingItem(
                        <Database size={22} color="#2563eb" />,
                        "Локальная база",
                        "Очистить кэш или пересоздать таблицы"
                    )}
                </View>
            </View>

            {/* Секция: Приложение */}
            <View className="mb-6">
                <Text className="px-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">Система</Text>
                <View className="border-t border-b border-gray-100">
                    {renderSettingItem(
                        <Bell size={22} color="#2563eb" />,
                        "Уведомления",
                        "Статус выгрузки и ошибки",
                        undefined,
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#d1d5db", true: "#bfdbfe" }}
                            thumbColor={notificationsEnabled ? "#2563eb" : "#f3f4f6"}
                        />
                    )}
                </View>
            </View>

            {/* Секция: О программе */}
            <View className="mb-10">
                <View className="border-t border-b border-gray-100">
                    {renderSettingItem(
                        <Info size={22} color="#2563eb" />,
                        "О Mobisklad",
                        "Версия 1.0.0 (abd)"
                    )}
                </View>
            </View>

            {/* Модальное окно синхронизации */}
            <SyncModal
                visible={isSyncModalVisible}
                onClose={() => setSyncModalVisible(false)}
                onRefreshData={onDataUpdate}
            />
        </ScrollView>
    );
};