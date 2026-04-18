export declare class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    originalPrice?: number;
    imageUrl?: string;
    badge?: string;
    badgeType?: string;
    featured?: boolean;
    active?: boolean;
    stock?: number;
    categoryId: number;
}
