export interface Client {
  id: string; // UUID из МойСклад — это всегда строка
  name: string;
  address: string;
  debt: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  catId?: string;
  article?: string;
  stock?: number;     // Доступно (остаток)
  reserve?: number;   // РЕЗЕРВ
  uom?: string;       // Единица измерения (ед. изм.)
  supplier?: string;  // Поставщик
  barcode?: string;
  img?: string;
  local_image_uri?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  parentId: string | null;
}

export interface OrderPosition {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderDetails {
  name: string;
  moment: string;
  agentName: string;
  sum: number;
  positions: OrderPosition[];
}