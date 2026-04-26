// hooks/useCatalogLogic.ts
import { useState, useMemo, useEffect } from 'react';
import { Product, Category } from '../types';


export const flattenCategoriesIterative = (rootCategories: Category[], subMap: Record<string, Category[]>, expanded: Record<string, boolean>): (Category & { level: number })[] => {
    const result: any[] = [];
    const stack = [...rootCategories].reverse().map(cat => ({ cat, level: 0 }));
    while (stack.length > 0) {
        const { cat, level } = stack.pop()!;
        result.push({ ...cat, level });
        if (expanded[cat.id] && subMap[cat.id]) {
            const children = subMap[cat.id];
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push({ cat: children[i], level: level + 1 });
            }
        }
    }
    return result;
};

export const useCatalogLogic = (
    products: Product[],
    categories: Category[],
    expandedFolders: Record<string, boolean>
) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [showOnlyInStock, setShowOnlyInStock] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 200);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Типизируем Map категорий
    const { subCategoriesMap, rootCategories } = useMemo(() => {
        const map: Record<string, Category[]> = {};

        const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));

        sorted.forEach((cat: Category) => {
            const pId = cat.parentId || 'root';
            if (!map[pId]) map[pId] = [];
            map[pId].push(cat);
        });

        return {
            subCategoriesMap: map,
            rootCategories: map['root'] || []
        };
    }, [categories]);

    // Типизируем фильтрацию товаров
    const filteredProducts = useMemo((): Product[] => {
        let result: Product[] = [];

        if (activeFolderId === 'none') {
            result = products.filter((p: Product) => !p.catId);
        } else {
            result = products.filter((p: Product) => p.catId === activeFolderId);
        }

        if (showOnlyInStock) {
            result = result.filter((p: Product) => (p.stock || 0) > 0);
        }

        return result;
    }, [activeFolderId, products, showOnlyInStock]);

    // Типизируем результаты поиска
    const searchResults = useMemo((): Product[] => {
        const query = debouncedQuery.trim().toLowerCase();
        if (query.length < 2) return [];

        const searchWords = query.split(/\s+/);

        return products
            .filter((p) => {
                const target = `${p.name} ${p.article || ''}`.toLowerCase();
                return searchWords.every(word => target.includes(word));
            })
            .sort((a, b) => {
                // Если запрос целиком есть в названии (точный порядок), поднимаем выше
                const aFullMatch = a.name.toLowerCase().includes(query);
                const bFullMatch = b.name.toLowerCase().includes(query);

                if (aFullMatch && !bFullMatch) return -1;
                if (!aFullMatch && bFullMatch) return 1;
                return 0;
            })
            .slice(0, 50);
    }, [debouncedQuery, products]);



    // Видимые категории (типизация массива с добавленным уровнем вложенности)
    const visibleCategories = useMemo((): (Category & { level: number })[] =>
        flattenCategoriesIterative(rootCategories, subCategoriesMap, expandedFolders),
        [rootCategories, subCategoriesMap, expandedFolders]
    );

    const productsCountMap = useMemo(() => {
        const map: Record<string, number> = {};
        products.forEach((p: Product) => {
            if (p.catId) {
                map[p.catId] = (map[p.catId] || 0) + 1;
            }
        });
        return map;
    }, [products]);

    return {
        searchQuery,
        setSearchQuery,
        debouncedQuery,
        activeFolderId,
        setActiveFolderId,
        showOnlyInStock,
        setShowOnlyInStock,
        filteredProducts,
        searchResults,
        visibleCategories,
        subCategoriesMap,
        productsCountMap,
    };
};