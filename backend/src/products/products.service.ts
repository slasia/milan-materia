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
    console.log(`[SHOP] Fetching products — filters: ${JSON.stringify(filters ?? {})}`);

    const products = await this.prisma.product.findMany({
      where,
      include: includeImages,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    });
    console.log(`[SHOP] Returned ${products.length} products`);
    return products;
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: includeImages,
    });
    if (!product) {
      console.warn(`[SHOP] Product #${id} not found`);
      throw new NotFoundException(`Product #${id} not found`);
    }
    return product;
  }

  async create(createProductDto: CreateProductDto) {
    console.log(`[ADMIN] Creating product — name: "${createProductDto.name}"`);
    const product = await this.prisma.product.create({
      data: createProductDto,
      include: includeImages,
    });
    console.log(`[ADMIN] Product created — id: ${product.id}, name: "${product.name}"`);
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    await this.findOne(id);
    console.log(`[ADMIN] Updating product #${id} — fields: ${Object.keys(updateProductDto).join(', ')}`);
    const product = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: includeImages,
    });
    console.log(`[ADMIN] Product #${id} updated`);
    return product;
  }

  async remove(id: number) {
    await this.findOne(id);
    console.log(`[ADMIN] Deleting product #${id}`);
    const result = await this.prisma.product.delete({ where: { id } });
    console.log(`[ADMIN] Product #${id} deleted`);
    return result;
  }

  async updateImage(id: number, imageUrl: string) {
    await this.findOne(id);
    console.log(`[ADMIN] Updating cover image for product #${id}`);

    await this.prisma.product.update({ where: { id }, data: { imageUrl } });

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

    console.log(`[ADMIN] Cover image updated for product #${id}`);
    return this.findOne(id);
  }

  async addImage(productId: number, url: string) {
    await this.findOne(productId);
    const count = await this.prisma.productImage.count({ where: { productId } });
    console.log(`[ADMIN] Adding image to product #${productId} (current count: ${count})`);

    const image = await this.prisma.productImage.create({
      data: { productId, url, sortOrder: count },
    });

    if (count === 0) {
      await this.prisma.product.update({ where: { id: productId }, data: { imageUrl: url } });
      console.log(`[ADMIN] First image set as cover for product #${productId}`);
    }

    console.log(`[ADMIN] Image #${image.id} added to product #${productId}`);
    return image;
  }

  async removeImage(productId: number, imageId: number) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      console.warn(`[ADMIN] Image #${imageId} not found for product #${productId}`);
      throw new NotFoundException('Imagen no encontrada');
    }

    console.log(`[ADMIN] Removing image #${imageId} from product #${productId}`);
    await this.prisma.productImage.delete({ where: { id: imageId } });

    const first = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: first?.url ?? null },
    });

    console.log(`[ADMIN] Image #${imageId} removed — new cover: ${first?.url ?? 'none'}`);
    return { deleted: imageId };
  }
}
