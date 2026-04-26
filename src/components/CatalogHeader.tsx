import React, { memo } from 'react'; // Добавили memo
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface CatalogHeaderProps {
  query: string;
  onSearch: (text: string) => void;
}

// Оборачиваем в memo, чтобы компонент обновлялся только при изменении query
export const CatalogHeader = memo(({ query, onSearch }: CatalogHeaderProps) => {
  return (
    <View className="px-4 pt-2 border-b border-gray-100 pb-2 bg-white">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-2xl font-[900] text-gray-900">Каталог</Text>
      </View>

      {/* Поле поиска */}
      <View className="flex-row items-center bg-gray-100 px-3 rounded-xl">
        <Search color="#94a3b8" size={18} />
        <TextInput
          className="flex-1 h-11 ml-2 text-gray-900 font-medium"
          placeholder="Поиск товара..."
          value={query}
          onChangeText={onSearch}
          autoCapitalize="none" // Чтобы первая буква не становилась заглавной сама
          autoCorrect={false}   // Отключаем автозамену для артикулов
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity 
            onPress={() => onSearch('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Увеличиваем зону клика
          >
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});