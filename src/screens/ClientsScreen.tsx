import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { ChevronRight, Search, User } from 'lucide-react-native';
import { Client } from '../types';

interface ClientsScreenProps {
  clients: Client[];
  selectedClientId?: string | number;
  onSelect: (client: Client) => void;
}

// Отдельный компонент для карточки (оптимизирован через memo)
const ClientItem = React.memo(({ 
  item, 
  isSelected, 
  onSelect 
}: { 
  item: Client; 
  isSelected: boolean;
  onSelect: (client: Client) => void 
}) => {
  // Получаем первую букву для аватара
  const firstLetter = item.name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      onPress={() => onSelect(item)}
      activeOpacity={0.6}
      className={`flex-row items-center p-4 mx-4 mb-2 rounded-2xl border ${
        isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-sm' 
          : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      {/* Круглый аватар */}
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
        isSelected ? 'bg-blue-500' : 'bg-gray-100'
      }`}>
        <Text className={`font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>
          {firstLetter || <User size={16} />}
        </Text>
      </View>

      <View className="flex-1">
        <Text numberOfLines={1} className="font-semibold text-[16px] text-gray-900">
          {item.name}
        </Text>
        <Text numberOfLines={1} className="text-[12px] text-gray-500 mt-0.5">
          {item.address || 'Адрес не указан'}
        </Text>
        
        <View className="flex-row mt-2">
          <View className={`px-2 py-0.5 rounded-md ${
            item.debt > 0 ? 'bg-red-50' : 'bg-green-50'
          }`}>
            <Text className={`text-[11px] font-bold ${
              item.debt > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {item.debt > 0 ? `Долг: ${item.debt} ₽` : 'Нет долга'}
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight color={isSelected ? '#3b82f6' : '#d1d5db'} size={20} />
    </TouchableOpacity>
  );
});

export const ClientsScreen: React.FC<ClientsScreenProps> = ({ clients, selectedClientId, onSelect }) => {
  const [search, setSearch] = useState('');

  // Фильтруем список на лету
  const filteredData = useMemo(() => {
    if (!search) return clients;
    return clients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address?.toLowerCase().includes(search.toLowerCase())
    );
  }, [clients, search]);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Шапка с поиском */}
      <View className="px-5 pt-4 pb-4 bg-white border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900 mb-3">Контрагенты</Text>
        <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-xl">
          <Search size={18} color="#9ca3af" />
          <TextInput
            placeholder="Поиск по названию или адресу..."
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-base text-gray-900"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Список */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ClientItem
            item={item}
            isSelected={selectedClientId === item.id}
            onSelect={onSelect}
          />
        )}
        contentContainerStyle={{ paddingVertical: 15 }}
        ListEmptyComponent={() => (
          <View className="mt-10 items-center">
            <Text className="text-gray-400 text-base">Ничего не найдено</Text>
          </View>
        )}
      />
    </View>
  );
};