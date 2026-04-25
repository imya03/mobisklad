import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Key, ChevronRight, AlertCircle } from 'lucide-react-native';
import { BASE_URL } from '../services/syncService';

interface AuthScreenProps {
    onSuccess: () => void; // Вызывается, когда ключ проверен и сохранен
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        if (!apiKey.trim()) {
            setError('Введите API ключ');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const headers = { 'Authorization': `Bearer ${apiKey}` };

            // Делаем запросы параллельно для скорости
            const [orgRes, storeRes] = await Promise.all([
                fetch(`${BASE_URL}/entity/organization`, { headers }),
                fetch(`${BASE_URL}/entity/store`, { headers })
            ]);

            if (!orgRes.ok || !storeRes.ok) {
                throw new Error('Неверный ключ или ошибка сервера');
            }

            const orgData = await orgRes.json();
            const storeData = await storeRes.json();

            if (!orgData.rows?.length || !storeData.rows?.length) {
                throw new Error('Данные организации или склада не найдены');
            }

            const orgId = orgData.rows[0].id;
            const storeId = storeData.rows[0].id;

            await SecureStore.setItemAsync('user_api_key', apiKey);
            await SecureStore.setItemAsync('store_id', storeId);
            await SecureStore.setItemAsync('org_id', orgId);

            onSuccess();
        } catch (e: any) {
            setError(e.message || "Ошибка авторизации");
            Alert.alert("Ошибка", "Не удалось войти. Проверьте ключ.");
        } finally {
            setIsLoading(false); // Обязательно выключаем индикатор
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white justify-center px-6"
        >
            <View className="items-center mb-10">
                <View className="w-20 h-20 bg-blue-50 rounded-3xl items-center justify-center mb-4">
                    <Key size={40} color="#3b82f6" />
                </View>
                <Text className="text-2xl font-black text-slate-900">Mobisklad</Text>
                <Text className="text-slate-500 mt-2 text-center">
                    Введите ваш API ключ для синхронизации данных
                </Text>
            </View>

            <View>
                <View className={`flex-row items-center bg-slate-100 px-4 py-4 rounded-2xl border ${error ? 'border-red-300' : 'border-transparent'}`}>
                    <TextInput
                        placeholder="Ключ доступа..."
                        value={apiKey}
                        onChangeText={(text) => {
                            setApiKey(text);
                            setError(null);
                        }}
                        secureTextEntry // Скрываем ключ для безопасности
                        className="flex-1 text-base text-slate-900"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {error && (
                    <View className="flex-row items-center mt-3 ml-1">
                        <AlertCircle size={14} color="#ef4444" />
                        <Text className="text-red-500 text-xs ml-1 font-medium">{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    className={`mt-6 py-4 rounded-2xl flex-row justify-center items-center ${isLoading ? 'bg-blue-300' : 'bg-blue-500'
                        }`}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Text className="text-white font-bold text-lg mr-2">Войти</Text>
                            <ChevronRight size={20} color="white" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <Text className="text-slate-400 text-xs text-center mt-10">
                Ключ хранится локально в зашифрованном виде
            </Text>
        </KeyboardAvoidingView>
    );
};