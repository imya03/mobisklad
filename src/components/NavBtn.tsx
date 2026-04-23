import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

export const NavBtn = ({ active, icon, label, onPress, badge }: any) => {
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.3}
      className="flex-1 h-full items-center justify-center"
      hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
      style={{ backgroundColor: 'transparent' }}
    >
      
      <View className="items-center justify-center w-full h-full">
        <View>
          {icon}
          {badge > 0 && (
            <View className="absolute -top-2 -right-3 bg-red-500 rounded-full min-w-[16px] h-[16px] items-center justify-center px-1">
              <Text className="text-white text-[9px] font-black">{badge}</Text>
            </View>
          )}
        </View>
        <Text 
          className={`text-[10px] mt-1 font-bold ${active ? 'text-blue-600' : 'text-gray-400'}`}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};