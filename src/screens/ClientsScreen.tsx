import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Client } from '../types';

interface ClientsScreenProps {
  clients: Client[];
  selectedClientId?: string | number; // Изменено здесь
  onSelect: (client: Client) => void;
}

export const ClientsScreen: React.FC<ClientsScreenProps> = ({ clients, selectedClientId, onSelect }) => {
  return (
    <ScrollView className="flex-1 px-5 pt-5">
      <Text className="text-[20px] font-bold mb-[15px] text-black">
        Контрагенты
      </Text>

      {clients.map(client => (
        <TouchableOpacity 
          key={client.id}
          onPress={() => onSelect(client)}
          activeOpacity={0.7}
          className={`flex-row items-center p-[15px] rounded-[15px] mb-[10px] border ${
            selectedClientId === client.id 
              ? 'bg-[#eff6ff] border-[#2563eb]' 
              : 'bg-white border-[#f3f4f6]'
          }`}
        >
          <View className="flex-1">
            <Text className="font-bold text-[16px] text-black">
              {client.name}
            </Text>
            <Text className="text-[12px] text-[#6b7280] mt-1">
              {client.address}
            </Text>
            
            <View className="flex-row mt-[10px]">
              <View 
                className={`px-2 py-1 rounded-lg ${
                  client.debt > 0 ? 'bg-[#fee2e2]' : 'bg-[#dcfce7]'
                }`}
              >
                <Text 
                  className={`text-[10px] font-bold ${
                    client.debt > 0 ? 'text-[#dc2626]' : 'text-[#16a34a]'
                  }`}
                >
                  Долг: {client.debt} ₽
                </Text>
              </View>
            </View>
          </View>
          
          <ChevronRight color="#d1d5db" size={20} />
        </TouchableOpacity>
      ))}
      {/* Отступ снизу для комфортного скролла */}
      <View className="h-10" />
    </ScrollView>
  );
};