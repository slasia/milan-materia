import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const includeImages = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { category?: string; featured?: boolean }) {
    const where: any = { active: true };
    if (filters?.category) where.category = { slug: filters.category };
    if (filters?.featured !== undefined) where.featured = filters.featured;

    return this.prisma.product.findMany({
      where,
      include: includeImages,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: includeImages,
    });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: createProductDto,
      include: includeImages,
    });
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: includeImages,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.delete({ where: { id } });
  }

  async updateImage(id: number, imageUrl: string) {
    await this.findOne(id);

    // Keep imageUrl in sync on the Product row
    await this.prisma.product.update({ where: { id }, data: { imageUrl } });

    // Upsert sortOrder=0 in ProductImage so the gallery is also in sync
    const firstImg = await this.prisma.productImage.findFirst({
      where: { productId: id },
      orderBy: { sortOrder: 'asc' },
    });

    if (firstImg) {
      await this.prisma.productImage.update({
        where: { id: firstImg.id },
        data: { url: imageUrl, sortOrder: 0 },
      });
    } else {
      await this.prisma.productImage.create({
        data: { productId: id, url: imageUrl, sortOrder: 0 },
      });
    }

    return this.findOne(id);
  }

  async addImage(productId: number, url: string) {
    await this.findOne(productId);
    const count = await this.prisma.productImage.count({ where: { productId } });
    const image = await this.prisma.productImage.create({
      data: { productId, url, sortOrder: count },
    });
    // First image → also set as cover (imageUrl) for backward compat
    if (count === 0) {
      await this.prisma.product.update({ where: { id: productId }, data: { imageUrl: url } });
    }
    return image;
  }

  async removeImage(productId: number, imageId: number) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) throw new NotFoundException('Imagen no encontrada');
    await this.prisma.productImage.delete({ where: { id: imageId } });

    // Re-sync imageUrl with first remaining image
    const first = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: first?.url ?? null },
    });

    return { deleted: imageId };
  }
}
