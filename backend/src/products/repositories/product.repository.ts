import type { Product, ProductImage, Prisma } from '@prisma/client';

// Flat DTO-shaped input — categoryId as a number (no nested connect required)
export type ProductCreateData = {
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
};

export type ProductUpdateData = Partial<ProductCreateData>;

export type ProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } };
    images: { orderBy: { sortOrder: 'asc' } };
  };
}>;

export type ProductFilters = {
  category?: string;
  featured?: boolean;
};

export type ImageUpdateData = {
  url?: string;
  sortOrder?: number;
};

export abstract class ProductRepository {
  // ── Products ──────────────────────────────────────────────────────────────
  abstract findAll(filters?: ProductFilters): Promise<ProductWithRelations[]>;
  abstract findById(id: number): Promise<ProductWithRelations | null>;
  abstract findByIds(ids: number[], activeOnly?: boolean): Promise<Product[]>;
  abstract findFresh(id: number, tx?: Prisma.TransactionClient): Promise<Product | null>;
  abstract create(data: ProductCreateData): Promise<ProductWithRelations>;
  abstract update(id: number, data: ProductUpdateData): Promise<ProductWithRelations>;
  abstract delete(id: number): Promise<Product>;
  abstract deleteMany(ids: number[]): Promise<{ count: number }>;
  abstract updateImageUrl(id: number, imageUrl: string | null): Promise<void>;
  abstract decrementStock(
    productId: number,
    qty: number,
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }>;

  // ── Product Images ────────────────────────────────────────────────────────
  abstract countImages(productId: number): Promise<number>;
  abstract findFirstImage(productId: number): Promise<ProductImage | null>;
  abstract findImageById(imageId: number): Promise<ProductImage | null>;
  abstract createImage(productId: number, url: string, sortOrder: number): Promise<ProductImage>;
  abstract updateImage(imageId: number, data: ImageUpdateData): Promise<ProductImage>;
  abstract deleteImage(imageId: number): Promise<void>;
}
