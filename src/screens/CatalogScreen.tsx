import React, { useState, useMemo, memo, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, FlatList, ScrollView } from 'react-native';
import { Search, ChevronDown, ChevronRight, ArrowLeft, RefreshCw, X } from 'lucide-react-native';

// Импорты твоих новых частей и сервисов
import { ProductCard } from '../components/ProductCard';
import { Product, Category } from '../types';
import { syncChangesOnly, syncClients, syncAllImagesOneByOne } from '../services/syncService';
import { useCatalogLogic } from '../hooks/useCatalogLogic';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { BackHandler } from 'react-native';
import { CatalogContent } from './CatalogContent';
import { CatalogHeader } from '../components/CatalogHeader';

const ITEM_HEIGHT = 56;





export const CatalogScreen = memo(({ products, categories, cart, onUpdateCart, expandedFolders, onToggleFolder }: any) => {
  // 1. ПОДКЛЮЧАЕМ ЛОГИКУ КАТАЛОГА (ХУК)
  const logic = useCatalogLogic(products, categories, expandedFolders);

  // 2. ОСТАВЛЯЕМ ВНУТРЕННИЕ СТЕЙТЫ ЭКРАНА
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [lastScrollOffset, setLastScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  // REFS
  const rootListRef = useRef<FlatList>(null);
  const productListRef = useRef<FlatList>(null);
  const currentOffset = useRef(0);
  const shouldRestoreScroll = useRef(false);


  // ОБРАБОТЧИК СКРОЛЛА
  const handleScroll = useCallback((e: any) => {
    // Сохраняем оффсет только когда мы в корне (список папок)
    if (!logic.activeFolderId) {
      currentOffset.current = e.nativeEvent.contentOffset.y;
    }
  }, [logic.activeFolderId]);

  // 4. ОБРАБОТЧИКИ НАВИГАЦИИ
  const handleOpenFolder = useCallback((folderId: string) => {
    setLastScrollOffset(currentOffset.current);
    logic.setActiveFolderId(folderId);
  }, [logic]);

  const handleBackToFolders = useCallback(() => {
    logic.setActiveFolderId(null);
    shouldRestoreScroll.current = true;
  }, [logic]);

  const handleSelectFromSearch = useCallback((item: any) => {
    // 1. Очищаем поиск в ОБOИХ местах для надежности
    setSearchQuery('');       // Локальный стейт экрана (для TextInput)
    logic.setSearchQuery(''); // Стейт внутри логики (чтобы закрыть список результатов)

    // 2. Проверяем категорию. 
    // В твоем хуке логики используется поле catId.
    // Проверяем его на существование и на то, что это не пустая строка/ноль.
    const folderId = item.catId || item.categoryId || item.parentId;
    const hasFolder = folderId && folderId !== "0" && folderId !== "";

    if (hasFolder) {
      // ВАЖНО: сначала открываем папку
      logic.setActiveFolderId(folderId);

      // Подсвечиваем товар, чтобы его было видно в списке
      setHighlightedProductId(item.id);

      // Даем FlatList время отрендериться и скроллим
      setTimeout(() => {
        productListRef.current?.scrollToItem({
          item,
          animated: true,
          viewPosition: 0.5
        });
      }, 150);
    } else {
      // Если категории действительно нет — открываем модалку
      setSelectedProduct(item);
    }
  }, [logic, productListRef]);


  const refs = useMemo(() => ({
    productListRef,
    rootListRef
  }), []);

  // 2. Убедись, что actions собраны без лишних console.log
  const actions = useMemo(() => ({
    handleSelectFromSearch,
    handleBackToFolders,
    setSelectedProduct,
    handleOpenFolder,
    onToggleFolder,
    handleScroll,
    getItemLayout: (data: any, index: number) => ({
      length: 56,
      offset: 56 * index,
      index,
    })
  }), [handleSelectFromSearch, handleBackToFolders, handleOpenFolder, onToggleFolder, handleScroll]);


  // ЭФФЕКТ ВОССТАНОВЛЕНИЯ СКРОЛЛА
  useEffect(() => {
    if (!logic.activeFolderId && shouldRestoreScroll.current) {
      const timer = setTimeout(() => {
        rootListRef.current?.scrollToOffset({ offset: lastScrollOffset, animated: false });
        shouldRestoreScroll.current = false;
      }, 16);
      return () => clearTimeout(timer);
    }
  }, [logic.activeFolderId, lastScrollOffset]);


  useEffect(() => {
    const backAction = () => {
      // 1. Если открыты детали заказа
      if (selectedProduct) {
        setSelectedProduct(null);
        return true; // "true" значит, что мы сами обработали нажатие
      }

      if (logic.activeFolderId) {
        logic.setActiveFolderId(null);
        shouldRestoreScroll.current = true;
        return true; // "true" значит, что мы сами обработали нажатие
      }


      // Если мы и так на главном экране (clients), возвращаем false.
      // Приложение закроется как обычно.
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    // Не забываем удалять слушатель при размонтировании компонента
    return () => backHandler.remove();
  }, [selectedProduct, logic.activeFolderId]); // Важно: следим за этими стейтами





  return (
    <View className="flex-1 bg-white">
      <CatalogHeader
        query={logic.searchQuery}
        onSearch={logic.setSearchQuery}
      />

      <View className="flex-1">
        <CatalogContent
          logic={logic}
          actions={actions}
          refs={refs}
          cart={cart}
          categories={categories}
        />
      </View>

      {selectedProduct ? (
        <ProductDetailModal
          product={selectedProduct}
          qty={cart[selectedProduct.id] || 0}
          onUpdate={onUpdateCart}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </View>
  );
});