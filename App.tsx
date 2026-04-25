import React, { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator } from 'react-native';
import { AuthScreen } from './src/screens/AuthScreen';
import MainApp from './MainApp'; // Твой основной код теперь тут

export default function App() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkKey() {
      const key = await SecureStore.getItemAsync('user_api_key');
      setIsAuth(!!key);
    }
    checkKey();
  }, []);

  if (isAuth === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Если не авторизован — показываем вход
  if (!isAuth) {
    return <AuthScreen onSuccess={() => setIsAuth(true)} />;
  }

  // Если авторизован — рендерим всё основное приложение
  return <MainApp />;
}