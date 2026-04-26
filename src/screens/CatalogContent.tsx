import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    FlatList, // <-- Добавь это
    TouchableOpacity,
    TextInput,
    ActivityIndicator
} from 'react-native';
import { ChevronDown, X, ArrowLeft, ChevronRight } from 'lucide-react-native';
import { ProductCard } from '../components/ProductCard';
// Компонент, который решает, ЧТО именно сейчас видит пользователь

// 1. Описываем, что именно мы передаем в компонент
interface CatalogContentProps {
    logic: any; // Можно заменить на конкретный тип твоего хука
    cart: Record<string, number>;
    refs: {
        productListRef: React.RefObject<any>;
        rootListRef: React.RefObject<any>;
    };
    actions: {
        handleSelectFromSearch: (item: any) => void;
        handleBackToFolders: () => void;
        setSelectedProduct: (product: any) => void;
        handleOpenFolder: (id: string) => void;
        onToggleFolder: (id: string) => void;
        handleScroll: (e: any) => void;
        getItemLayout: (data: any, index: number) => any;
    };
    categories: any[];
}

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
const ITEM_HEIGHT = 56;
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

export const CatalogContent = memo(({
    logic,
    actions,
    refs,
    cart,
    categories
}: CatalogContentProps) => {
    // 1. Основная проверка на загрузку
    if (!logic || !logic.visibleCategories) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }
    // 1. Состояние поиска (Приоритет №1)
    if (logic.debouncedQuery.length >= 2) {
        return (
            <FlatList
                data={logic.searchResults}
                keyExtractor={item => `s-${item.id}`}
                renderItem={({ item }) => (
                    <SearchItemRow
                        item={item}
                        onPress={() => actions.handleSelectFromSearch(item)}
                    />
                )}
            />
        );
    }
    // Внутри CatalogContent перед return
    const currentFolderName = useMemo(() => {
        if (!logic.activeFolderId) return '';

        // 1. Пытаемся найти в массиве категорий из пропсов (нужно передать categories в CatalogContent)
        // Либо ищем в logic.visibleCategories, но используем нестрогое сравнение
        const currentCat = categories?.find(c => String(c.id) === String(logic.activeFolderId));

        if (currentCat) return currentCat.name;

        // 2. Запасной вариант: если это папка "Без категории"
        if (logic.activeFolderId === 'none') return 'Без категории';

        return 'Папка';
    }, [logic.activeFolderId, categories, logic.visibleCategories]);

    // 2. Просмотр товаров в конкретной папке (Приоритет №2)
    if (logic.activeFolderId) {
        return (
            <View className="flex-1">
                <TouchableOpacity
                    onPress={actions.handleBackToFolders}
                    className="flex-row items-center px-4 py-3 bg-blue-50/50 border-b border-blue-100"
                >
                    <View className="flex-row items-center flex-1">
                        <ArrowLeft color="#2563eb" size={20} />
                        {/* Контейнер для текста, чтобы длинные названия не ломали верстку */}
                        <View className="ml-2 flex-1">
                            <Text className="text-[11px] text-blue-400 font-medium uppercase">Назад к списку</Text>
                            <Text numberOfLines={1} className="font-bold text-blue-700 text-[15px]">
                                {currentFolderName}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <FlatList
                    ref={refs.productListRef}
                    data={logic.filteredProducts}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <ProductCard
                            product={item}
                            onPress={actions.setSelectedProduct}
                            quantity={cart[item.id] || 0}
                            imageUri={item.local_image_uri || item.img}
                            isHighlighted={logic.highlightedProductId === item.id}
                        />
                    )}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                />
            </View>
        );
    }



    // 3. Основной список папок (Состояние по умолчанию)
    return (
        <FlatList
            ref={refs.rootListRef}
            data={logic.visibleCategories}
            keyExtractor={item => `f-${item.id}`}
            getItemLayout={actions.getItemLayout}
            onScroll={actions.handleScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => {
                // Безопасно достаем данные, чтобы даже если logic пустой, ничего не падало
                const subCategories = logic?.subCategoriesMap?.[item.id] || [];
                const productCount = logic?.productsCountMap?.[item.id] || 0;
                const isFolderOpen = !!(logic?.expandedFolders?.[item.id]);

                return (
                    <FolderRow
                        category={item}
                        subCount={subCategories.length}
                        hasProducts={productCount > 0}
                        isOpen={isFolderOpen}
                        onOpenFolder={actions.handleOpenFolder}
                        onToggleFolder={actions.onToggleFolder}
                    />
                );
            }}
            contentContainerStyle={{ paddingBottom: 100 }}
        />
    );
});