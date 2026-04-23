import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Minus, Plus, ShoppingCart } from 'lucide-react-native';
import { Product, Client } from '../types';
import { syncClientHistory } from '../services/syncService';

interface CartScreenProps {
  cart: Record<string, number>;
  products: Product[];
  client: Client | null;
  onUpdateCart: (id: string, delta: number) => void;
  onCheckout: () => void;
  isLoading?: boolean; // <-- Добавляем это
}

export const CartScreen: React.FC<CartScreenProps> = ({
  cart,
  products,
  client,
  onUpdateCart,
  onCheckout,
  isLoading // <-- И здесь
}) => {
  // 1. Убираем parseInt. Теперь ID — это строки.
  const total = useMemo(() => {
    return Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = products.find(item => item.id === id); // Сравнение строк
      return sum + (p ? p.price * qty : 0);
    }, 0);
  }, [cart, products]);

  if (total === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ShoppingCart size={64} color="#d1d5db" />
        <Text className="text-[#9ca3af] mt-[10px] font-bold">Корзина пуста</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="px-5 pt-5">
        <Text className="text-2xl font-bold mb-5">Оформление</Text>

        {client && (
          <View className="bg-[#eff6ff] p-[15px] rounded-[15px] mb-5">
            <Text className="text-[8px] text-[#60a5fa] font-bold uppercase tracking-wider">КЛИЕНТ</Text>
            <Text className="text-[16px] font-bold text-[#1e3a8a]">{client.name}</Text>
          </View>
        )}

        {Object.entries(cart).map(([id, qty]) => {
          // 2. Ищем товар по строковому ID
          const p = products.find(item => item.id === id);

          // Если товар не найден (например, удален из базы), не рендерим его
          if (!p) return null;

          return (
            <View key={id} className="flex-row items-center py-[15px] border-b border-[#f3f4f6]">
              <View className="flex-1">
                <Text className="font-bold text-black text-[15px]">{p.name}</Text>
                <Text className="text-[#9ca3af] mt-1">
                  {qty} x {p.price.toLocaleString()} ₽
                </Text>
              </View>

              <View className="flex-row items-center bg-gray-50 rounded-lg p-1">
                <TouchableOpacity
                  onPress={() => onUpdateCart(p.id, -1)}
                  className="p-2"
                >
                  <Minus size={16} color={qty > 0 ? "#4b5563" : "#d1d5db"} />
                </TouchableOpacity>

                <Text className="mx-3 font-bold text-[16px]">{qty}</Text>

                <TouchableOpacity
                  onPress={() => onUpdateCart(p.id, 1)}
                  className="p-2"
                >
                  <Plus size={16} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <View className="h-20" />
      </ScrollView>

      {/* Footer */}
      <View className="p-5 border-t border-[#f3f4f6] bg-white shadow-lg">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-400 font-bold">ИТОГО</Text>
          <Text className="text-2xl font-[900] text-blue-600">
            {total.toLocaleString()} ₽
          </Text>
        </View>

        <TouchableOpacity

          onPress={async () => { // Добавили async
            onCheckout()
            if (client?.id) {
              await syncClientHistory(client.id);
            }
          }}
          disabled={isLoading} // Блокируем кнопку при отправке
          className={`p-[18px] rounded-[15px] items-center ${isLoading ? 'bg-gray-400' : 'bg-[#2563eb]'}`}
          activeOpacity={0.8}

        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-[16px]">Отгрузить заказ</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};