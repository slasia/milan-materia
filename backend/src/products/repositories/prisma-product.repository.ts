import { Injectable } from '@nestjs/common';
import type { Product, ProductImage, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProductRepository,
  ProductWithRelations,
  ProductFilters,
  ProductCreateData,
  ProductUpdateData,
  ImageUpdateData,
} from './product.repository';

const includeImages = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class PrismaProductRepository extends ProductRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll(filters?: ProductFilters): Promise<ProductWithRelations[]> {
    const where: Prisma.ProductWhereInput = { active: true };
    if (filters?.category) where.category = { slug: filters.category };
    if (filters?.featured !== undefined) where.featured = filters.featured;

    return this.prisma.product.findMany({
      where,
      include: includeImages,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findById(id: number): Promise<ProductWithRelations | null> {
    return this.prisma.product.findUnique({ where: { id }, include: includeImages });
  }

  async findByIds(ids: number[], activeOnly = false): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { id: { in: ids }, ...(activeOnly ? { active: true } : {}) },
    });
  }

  async findFresh(id: number, tx?: Prisma.TransactionClient): Promise<Product | null> {
    const client = tx ?? this.prisma;
    return client.product.findUnique({ where: { id } });
  }

  async create(data: ProductCreateData): Promise<ProductWithRelations> {
    const { categoryId, ...rest } = data;
    return this.prisma.product.create({
      data: { ...rest, category: { connect: { id: categoryId } } },
      include: includeImages,
    });
  }

  async update(id: number, data: ProductUpdateData): Promise<ProductWithRelations> {
    const { categoryId, ...rest } = data;
    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryId !== undefined ? { category: { connect: { id: categoryId } } } : {}),
      },
      include: includeImages,
    });
  }

  async delete(id: number): Promise<Product> {
    return this.prisma.product.delete({ where: { id } });
  }

  async deleteMany(ids: number[]): Promise<{ count: number }> {
    const result = await this.prisma.product.deleteMany({ where: { id: { in: ids } } });
    return { count: result.count };
  }

  async updateImageUrl(id: number, imageUrl: string | null): Promise<void> {
    await this.prisma.product.update({ where: { id }, data: { imageUrl } });
  }

  async decrementStock(
    productId: number,
    qty: number,
    tx?: Prisma.TransactionClient,
  ): Promise<{ count: number }> {
    const client = tx ?? this.prisma;
    const result = await client.product.updateMany({
      where: { id: productId, active: true, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    return { count: result.count };
  }

  async countImages(productId: number): Promise<number> {
    return this.prisma.productImage.count({ where: { productId } });
  }

  async findFirstImage(productId: number): Promise<ProductImage | null> {
    return this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findImageById(imageId: number): Promise<ProductImage | null> {
    return this.prisma.productImage.findUnique({ where: { id: imageId } });
  }

  async createImage(productId: number, url: string, sortOrder: number): Promise<ProductImage> {
    return this.prisma.productImage.create({ data: { productId, url, sortOrder } });
  }

  async updateImage(imageId: number, data: ImageUpdateData): Promise<ProductImage> {
    return this.prisma.productImage.update({ where: { id: imageId }, data });
  }

  async deleteImage(imageId: number): Promise<void> {
    await this.prisma.productImage.delete({ where: { id: imageId } });
  }
}
