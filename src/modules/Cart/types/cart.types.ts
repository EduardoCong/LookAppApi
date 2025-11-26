export type CartPaymentResult = {
    storeId: number;
    storeName: string;
    subtotal: number;
    stripe: {
        id: string;
        amount: number;
        status: string;
    };
    purchases: any[];
};


export interface CartItemProduct {
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
    items: CartItemProduct[];
}
