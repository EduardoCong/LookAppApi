export interface CartProductItem {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    total: number;
}

export interface CartStoreGroup {
    storeId: number;
    storeName: string;
    subtotal: number;
    items: CartProductItem[];
}
