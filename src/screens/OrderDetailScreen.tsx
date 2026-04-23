import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { ChevronLeft, Package, Calendar, User, CreditCard } from 'lucide-react-native';
 import { OrderDetails } from '../types';

interface OrderDetailScreenProps {
  order: OrderDetails;
  onBack: () => void;
}

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({ order, onBack }) => {
  // Форматирование валюты (из копеек в рубли)
  const formatCurrency = (amount: number) => {
    return (amount / 100).toLocaleString('ru-RU') + ' ₽';
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-slate-200">
        <TouchableOpacity onPress={onBack} className="p-2 -ml-2">
          <ChevronLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-2 text-slate-800">Заказ {order.name}</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4">
        {/* Инфо-карточка заказа */}
        <View className="bg-white p-4 rounded-2xl shadow-sm mb-6">
          <View className="flex-row items-center mb-3">
            <Calendar size={16} color="#64748b" />
            <Text className="ml-2 text-slate-500 text-sm">{order.moment}</Text>
          </View>
          
          <View className="flex-row items-center mb-3">
            <User size={16} color="#64748b" />
            <Text className="ml-2 text-slate-800 font-semibold">{order.agentName}</Text>
          </View>

          <View className="flex-row items-center">
            <CreditCard size={16} color="#64748b" />
            <Text className="ml-2 text-blue-600 font-bold text-lg">
              {formatCurrency(order.sum)}
            </Text>
          </View>
        </View>

        {/* Список товаров */}
        <Text className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-3 ml-1">
          Состав заказа
        </Text>

        {order.positions.map((item) => (
          <View key={item.id} className="bg-white p-4 rounded-xl mb-3 flex-row items-center border border-slate-100">
            <View className="bg-blue-50 p-3 rounded-lg mr-4">
              <Package size={20} color="#3b82f6" />
            </View>
            
            <View className="flex-1">
              <Text className="text-slate-800 font-bold text-sm mb-1" numberOfLines={2}>
                {item.name}
              </Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-xs">
                  {item.quantity} шт. × {formatCurrency(item.price)}
                </Text>
                <Text className="text-slate-900 font-semibold">
                  {formatCurrency(item.price * item.quantity)}
                </Text>
              </View>
            </View>
          </View>
        ))}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
};