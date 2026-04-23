import React, { useState, useMemo, memo, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, FlatList, ScrollView } from 'react-native';
import { Search, ChevronDown, ChevronRight, ArrowLeft, RefreshCw, X } from 'lucide-react-native';

// Импорты твоих новых частей и сервисов
import { ProductCard } from '../components/ProductCard';
import { Product, Category } from '../types';
import { syncChangesOnly, syncClients, syncAllImagesOneByOne } from '../services/syncService';
import { useCatalogLogic } from '../hooks/useCatalogLogic';
import { ProductDetailModal } from '../components/ProductDetailModal';

const ITEM_HEIGHT = 56;

// Вспомогательные компоненты (SearchItemRow и FolderRow) оставляем без изменений...
const SearchItemRow = memo(({ item, onPress }: { item: any, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} className="flex-row items-center justify-between py-3 px-4 border-b border-gray-50 active:bg-gray-50">
    <View className="flex-1 mr-4">
      <Text numberOfLines={2} className="text-[14px] font-medium text-gray-900">{item.name}</Text>
      {item.article && <Text className="text-[11px] text-gray-400 mt-0.5">Арт: {item.article}</Text>}
    </View>
    <View className="items-end">
      <Text className="text-[14px] font-bold text-blue-600">{item.price} ₽</Text>
      <Text className="text-[11px] text-gray-500">Ост: {item.stock || 0}</Text>
    </View>
  </TouchableOpacity>
));

const FolderRow = memo(({ category, subCount, hasProducts, onOpenFolder, isOpen, onToggleFolder }: any) => {
  const hasSubfolders = subCount > 0;
  return (
    <View style={{ paddingLeft: category.level * 16, height: ITEM_HEIGHT }} className={`border-b border-gray-100 justify-center ${isOpen ? 'bg-blue-50/30' : 'bg-white'}`}>
      <View className="flex-row items-center">
        <TouchableOpacity onPress={() => onToggleFolder(category.id)} className="w-12 h-14 items-center justify-center">
          {hasSubfolders && (isOpen ? <ChevronDown color="#2563eb" size={20} /> : <ChevronRight color="#d1d5db" size={20} />)}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => hasProducts ? onOpenFolder(category.id) : (hasSubfolders && onToggleFolder(category.id))} className="flex-1 py-4 flex-row items-center justify-between">
          <Text numberOfLines={1} className={`text-[15px] flex-1 ${isOpen ? 'font-bold text-blue-600' : 'font-medium text-gray-900'}`}>{category.name}</Text>
          {hasSubfolders && <View className="bg-gray-100 px-2 py-1 rounded-md mr-4"><Text className="text-[11px] font-bold text-gray-500">{subCount}</Text></View>}
        </TouchableOpacity>
      </View>
    </View>
  );
});

export const CatalogScreen = memo(({ products, categories, cart, onUpdateCart, expandedFolders, onToggleFolder, refreshData }: any) => {
  // 1. ПОДКЛЮЧАЕМ ЛОГИКУ КАТАЛОГА (ХУК)
  const logic = useCatalogLogic(products, categories, expandedFolders);

  // 2. ОСТАВЛЯЕМ ВНУТРЕННИЕ СТЕЙТЫ ЭКРАНА
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [lastScrollOffset, setLastScrollOffset] = useState(0);

  // REFS
  const rootListRef = useRef<FlatList>(null);
  const productListRef = useRef<FlatList>(null);
  const currentOffset = useRef(0);
  const shouldRestoreScroll = useRef(false);

  // 3. ФУНКЦИИ СИНХРОНИЗАЦИИ (Оставляем здесь, так как они меняют локальный стейт экрана)
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncClients();
      const success = await syncChangesOnly((p) => console.log(`${p.step}: ${p.count}`));
      if (success && refreshData) await refreshData();
    } catch (e) {
      console.error('Ошибка синхронизации:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const startSyncImg = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await syncAllImagesOneByOne((current, total) => setProgress({ current, total }));
      if (refreshData) await refreshData();
    } catch (e) {
      console.error('Ошибка загрузки фото:', e);
    } finally {
      setLoading(false);
    }
  };

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
    logic.setSearchQuery('');
    logic.setActiveFolderId(item.catId || 'none');
    setHighlightedProductId(item.id);
    setTimeout(() => setHighlightedProductId(null), 3000);
  }, [logic]);

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

  // Макет для FlatList
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}
      <View className="px-4 pt-2 border-b border-gray-100 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-[900] text-gray-900">Каталог</Text>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={startSyncImg} disabled={loading} className="bg-blue-600 px-4 py-2 rounded-full mr-2">
              <Text className='text-white font-[900] text-[12px]'>
                {loading ? `${progress.current}/${progress.total}` : "Sync Img"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSync} disabled={isSyncing} className="bg-blue-600 px-4 py-2 rounded-full flex-row items-center">
              {isSyncing ? <ActivityIndicator size="small" color="white" /> : (
                <>
                  <RefreshCw size={14} color="white" />
                  <Text className="text-white font-bold ml-2 text-[12px]">Данные</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ПОИСК */}
        <View className="flex-row items-center bg-gray-100 px-3 rounded-xl">
          <Search color="#94a3b8" size={18} />
          <TextInput
            className="flex-1 h-11 ml-2 text-gray-900 font-medium"
            placeholder="Поиск товара..."
            value={logic.searchQuery}
            onChangeText={logic.setSearchQuery}
          />
          {logic.searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => logic.setSearchQuery('')}><X size={18} color="#94a3b8" /></TouchableOpacity>
          )}
        </View>

        {/* ФИЛЬТРЫ */}
        <View className="py-2 pb-1 flex-row">
          <TouchableOpacity
            onPress={() => logic.setShowOnlyInStock(!logic.showOnlyInStock)}
            className={`px-4 py-2 rounded-full border ${logic.showOnlyInStock ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
          >
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-2 ${logic.showOnlyInStock ? 'bg-white' : 'bg-green-500'}`} />
              <Text className={`font-bold text-[12px] ${logic.showOnlyInStock ? 'text-white' : 'text-gray-600'}`}>В наличии</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT */}
      <View className="flex-1">
        {logic.debouncedQuery.length >= 2 ? (
          <FlatList
            data={logic.searchResults}
            keyExtractor={item => `s-${item.id}`}
            renderItem={({ item }) => <SearchItemRow item={item} onPress={() => handleSelectFromSearch(item)} />}
          />
        ) : logic.activeFolderId ? (
          <View className="flex-1">
            <TouchableOpacity onPress={handleBackToFolders} className="flex-row items-center px-4 py-3 bg-blue-50/50 border-b border-blue-100">
              <ArrowLeft color="#2563eb" size={20} />
              <Text className="ml-2 font-bold text-blue-700">Назад к папкам</Text>
            </TouchableOpacity>
            <FlatList
              ref={productListRef}
              data={logic.filteredProducts}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onPress={setSelectedProduct}
                  quantity={cart[item.id] || 0}
                  imageUri={item.local_image_uri || item.img}
                  isHighlighted={highlightedProductId === item.id}
                />
              )}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            />
          </View>
        ) : (
          <FlatList
            ref={rootListRef}
            data={logic.visibleCategories}
            keyExtractor={item => `f-${item.id}`}
            getItemLayout={getItemLayout}
            onScroll={(e) => { if (!logic.activeFolderId) currentOffset.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <FolderRow
                category={item}
                subCount={logic.subCategoriesMap[item.id]?.length || 0}
                hasProducts={(logic.productsCountMap[item.id] || 0) > 0}
                isOpen={!!expandedFolders[item.id]}
                onOpenFolder={handleOpenFolder}
                onToggleFolder={onToggleFolder}
              />
            )}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {/* 5. ПОЛНОЭКРАННАЯ МОДАЛКА (ВЫНЕСЕННАЯ) */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          qty={cart[selectedProduct.id] || 0}
          onUpdate={onUpdateCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </View>
  );
});