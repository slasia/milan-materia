import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(filters?: {
        category?: string;
        featured?: boolean;
    }): Promise<({
        category: {
            id: number;
            name: string;
            slug: string;
        };
    } & {
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        imageUrl: string | null;
        active: boolean;
        price: number;
        originalPrice: number | null;
        badge: string | null;
        badgeType: string | null;
        featured: boolean;
        stock: number;
        categoryId: number;
    })[]>;
    findOne(id: number): Promise<{
        category: {
            id: number;
            name: string;
            slug: string;
        };
    } & {
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        imageUrl: string | null;
        active: boolean;
        price: number;
        originalPrice: number | null;
        badge: string | null;
        badgeType: string | null;
        featured: boolean;
        stock: number;
        categoryId: number;
    }>;
    create(createProductDto: CreateProductDto): Promise<{
        category: {
            id: number;
            name: string;
            slug: string;
        };
    } & {
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        imageUrl: string | null;
        active: boolean;
        price: number;
        originalPrice: number | null;
        badge: string | null;
        badgeType: string | null;
        featured: boolean;
        stock: number;
        categoryId: number;
    }>;
    update(id: number, updateProductDto: UpdateProductDto): Promise<{
        category: {
            id: number;
            name: string;
            slug: string;
        };
    } & {
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        imageUrl: string | null;
        active: boolean;
        price: number;
        originalPrice: number | null;
        badge: string | null;
        badgeType: string | null;
        featured: boolean;
        stock: number;
        categoryId: number;
    }>;
    remove(id: number): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        imageUrl: string | null;
        active: boolean;
        price: number;
        originalPrice: number | null;
        badge: string | null;
        badgeType: string | null;
        featured: boolean;
        stock: number;
        categoryId: number;
    }>;
    updateImage(id: number, imageUrl: string): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        imageUrl: string | null;
        active: boolean;
        price: number;
        originalPrice: number | null;
        badge: string | null;
        badgeType: string | null;
        featured: boolean;
        stock: number;
        categoryId: number;
    }>;
}
