// Добавь memo сюда
import React, { useState, useMemo, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { ArrowLeft } from 'lucide-react-native'; // Не забудь про иконки, если они в этом файле


// Вспомогательный компонент для полей характеристик
export const DetailField = ({ label, value, color = "text-gray-900" }: any) => (
  <View className="w-1/2 mb-4 px-1">
    <Text className="text-[10px] text-gray-400 uppercase font-black mb-0.5">{label}</Text>
    <Text numberOfLines={1} className={`text-[14px] font-bold ${color}`}>{value || '—'}</Text>
  </View>
);

export const ProductDetailModal = memo(({ product, qty, onUpdate, onClose }: any) => {
    const [qtyInput, setQtyInput] = useState(String(qty || 0));
    const totalSum = (parseFloat(qtyInput) || 0) * product.price;

    return (
        <View className="absolute inset-0 bg-white z-[60]">
            <View className="px-4 pt-3 pb-3 flex-row items-center border-b border-gray-100 bg-white">
                <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
                    <ArrowLeft size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text className="ml-4 text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>{product.name}</Text>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="p-4">
                    <View className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mt-2 flex-row items-center">
                        <View className="flex-1 items-center">
                            <Text className="text-[10px] text-gray-400 mb-1">Кол-во</Text>
                            <TextInput
                                className="w-full h-14 bg-white rounded-2xl text-center text-xl font-black text-blue-600 border border-blue-50"
                                keyboardType="numeric"
                                value={qtyInput}
                                onChangeText={t => setQtyInput(t.replace(/[^0-9]/g, ''))}
                                selectTextOnFocus
                            />
                        </View>
                        <Text className="mx-2 text-gray-300 text-xl mt-5">×</Text>
                        <View className="flex-1 items-center">
                            <Text className="text-[10px] text-gray-400 mb-1">Цена</Text>
                            <View className="w-full h-14 bg-gray-100/50 rounded-2xl justify-center items-center">
                                <Text className="text-lg font-bold text-gray-500">{product.price.toLocaleString()}</Text>
                            </View>
                        </View>
                        <Text className="mx-2 text-gray-300 text-xl mt-5">=</Text>
                        <View className="flex-1 items-center">
                            <Text className="text-[10px] text-blue-500 mb-1 font-bold">Сумма</Text>
                            <View className="w-full h-14 bg-blue-600 rounded-2xl justify-center items-center">
                                <Text className="text-lg font-black text-white px-1" numberOfLines={1} adjustsFontSizeToFit>{totalSum.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => { onUpdate(product.id, parseInt(qtyInput) || 0, true); onClose(); }}
                        className="bg-blue-600 py-4 rounded-2xl items-center mt-4"
                    >
                        <Text className="text-white font-black text-lg">Подтвердить</Text>
                    </TouchableOpacity>

                    <View className="w-full h-64 bg-gray-50 rounded-3xl items-center justify-center border border-gray-100 my-6">
                        <Image source={{ uri: product.local_image_uri || product.img }} className="w-48 h-48" resizeMode="contain" />
                    </View>

                    <View className="bg-gray-50 rounded-3xl p-5 border border-gray-100 flex-row flex-wrap">
                        <DetailField label="Артикул" value={product.article} />
                        <DetailField label="Доступно" value={product.stock} />
                        <DetailField label="Поставщик" value={product.supplier} />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
});