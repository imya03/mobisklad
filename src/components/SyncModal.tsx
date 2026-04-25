import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator, BackHandler } from 'react-native';
import { X, Terminal, RefreshCw, Image as ImageIcon } from 'lucide-react-native';
import { syncChangesOnly, syncClients, syncAllImagesOneByOne } from '../services/syncService';
import { BackHandlerStatic } from 'react-native';
export const SyncModal = ({ visible, onClose, onRefreshData }: any) => {
    const [logs, setLogs] = useState<string[]>([]);
    const [syncType, setSyncType] = useState<'none' | 'data' | 'images'>('none');
    const scrollViewRef = useRef<ScrollView>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Блокировка кнопки "Назад" на Android
    useEffect(() => {
        const onBackPress = () => {
            if (syncType === 'data') return true; // Блокируем выход
            if (syncType === 'images') {
                stopImageSync();
                return true;
            }
            return false; // Позволяем закрыть модалку/приложение
        };

        // addEventListener возвращает объект подписки (NativeEventSubscription)
        const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

        // Очистка: вызываем .remove() у самой подписки
        return () => backHandler.remove();
    }, [syncType]);

    const addLog = (message: string) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLogs(prev => [...prev, `[${time}] ${message}`]);
    };

    const runDataSync = async () => {
        if (syncType !== 'none') return;
        setSyncType('data');
        addLog("🚀 Синхронизация данных (НЕ ЗАКРЫВАЙТЕ...)");

        try {
            await syncClients();
            await syncChangesOnly((p) => addLog(`${p.step} ${p.count}`));
            addLog("✅ Данные обновлены!");
            if (onRefreshData) await onRefreshData();
        } catch (e: any) {
            addLog(`❌ Ошибка данных: ${e.message}`);
        } finally {
            setSyncType('none');
        }
    };

    const runImageSync = async () => {
        if (syncType !== 'none') return;

        abortControllerRef.current = new AbortController();
        setSyncType('images');
        addLog("🖼️ Загрузка фото (можно отменить)");

        try {
            await syncAllImagesOneByOne((curr, tot, msg) => {
                addLog(`[${curr}/${tot}] ${msg}`);
            }, abortControllerRef.current.signal);
            addLog("Загрузка остановлена!");
            if (onRefreshData) await onRefreshData();
        } catch (e: any) {
            addLog(abortControllerRef.current.signal.aborted ? "🛑 Загрузка фото прервана" : `❌ Ошибка: ${e.message}`);
        } finally {
            setSyncType('none');
            abortControllerRef.current = null;
        }
    };

    const stopImageSync = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setSyncType('none');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            // Это запрещает закрытие свайпом на iOS
            onRequestClose={() => { if (syncType === 'none') onClose(); }}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl h-[85%] px-5 pt-6">

                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-black text-slate-800">Синхронизация</Text>

                        {/* Скрываем крестик, если идет важная синхронизация */}
                        {syncType === 'none' && (
                            <TouchableOpacity onPress={onClose} className="p-2 bg-slate-100 rounded-full">
                                <X color="#64748b" size={20} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Индикатор блокировки */}
                    {syncType === 'data' && (
                        <View className="bg-amber-50 p-3 rounded-xl mb-4 border border-amber-200">
                            <Text className="text-amber-700 text-xs font-bold text-center">
                                Идет запись в базу данных. Пожалуйста, подождите...
                            </Text>
                        </View>
                    )}

                    {/* Кнопка отмены для фото */}
                    {syncType === 'images' && (
                        <TouchableOpacity onPress={stopImageSync} className="bg-red-500 p-4 rounded-2xl mb-4">
                            <Text className="text-white font-bold text-center">ОСТАНОВИТЬ ЗАГРУЗКУ ФОТО</Text>
                        </TouchableOpacity>
                    )}

                    {/* Основные кнопки управления */}
                    {syncType === 'none' && (
                        <View className="flex-row gap-3 mb-6">
                            <TouchableOpacity onPress={runDataSync} className="flex-1 bg-blue-600 p-4 rounded-2xl">
                                <Text className="text-white font-bold text-center">Обновить данные</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={runImageSync} className="flex-1 bg-slate-800 p-4 rounded-2xl">
                                <Text className="text-white font-bold text-center">Загрузить фото</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Консоль */}
                    <View className="flex-1 bg-slate-900 rounded-2xl p-4 mb-6">
                        <ScrollView ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}>
                            {logs.map((log, i) => (
                                <Text key={i} className="text-white font-mono text-[12px] mb-1">{log}</Text>
                            ))}
                            {syncType !== 'none' && <ActivityIndicator color="#ffffff" style={{ marginTop: 10 }} />}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </Modal>
    );
};