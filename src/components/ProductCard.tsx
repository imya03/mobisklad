// components/ProductCard.tsx
import React, { memo, useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, Text, View, Image } from 'react-native';

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('ru-RU') + ' ₽';
};

export const ProductCard = memo(({ product, quantity, onPress, isHighlighted }: any) => {

  const animatedValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isHighlighted ? 1 : 0,
      duration: 500, // Длительность анимации в мс
      useNativeDriver: false, // Для цвета фона должно быть false
    }).start();
  }, [isHighlighted]);
  // Интерполяция цвета: от белого к нежно-голубому
  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', '#eff6ff'] // bg-white -> bg-blue-50
  });

  // Интерполяция цвета границы: от серого к синему
  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f3f4f6', '#60a5fa'] // border-gray-100 -> border-blue-400
  });

  return (
    <TouchableOpacity onPress={() => onPress(product)} activeOpacity={0.7}>
      <Animated.View
        style={{ backgroundColor, borderColor }}
        className="p-2 mb-2 rounded-xl border flex-row items-center h-[80px]"
      >
        <View className="w-[60px] h-[60px] bg-gray-50 rounded-lg items-center justify-center mr-3 overflow-hidden border border-gray-50">
          <Image
            source={{ uri: product.local_image_uri || product.img }}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>

        <View className="flex-1 h-full justify-between py-0.5">
          <Text numberOfLines={2} className="text-[13px] font-medium text-gray-900 leading-4">
            {product.name}
          </Text>

          <View className="flex-row items-baseline justify-between">
            <Text className="text-[15px] font-bold text-blue-600">{formatCurrency(product.price)} ₽</Text>
            <Text className="text-[10px] text-gray-400">Ост: {product.stock || 0}</Text>
          </View>
        </View>

        {quantity > 0 && (
          <View className="ml-2 px-2 py-1 bg-[#f0fff7] rounded-lg border border-[#60d69a]">
            <Text className="text-[12px] font-bold text-[#23a060]">{quantity}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});
