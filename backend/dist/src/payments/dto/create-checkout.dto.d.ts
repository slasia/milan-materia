export declare class CheckoutItemDto {
    productId: number;
    quantity: number;
}
export declare class CreateCheckoutDto {
    items: CheckoutItemDto[];
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    promoCode?: string;
    shippingAddress?: string;
    notes?: string;
}
