import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ProductRepository, ProductWithRelations, ProductCreateData, ProductUpdateData } from './repositories/product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private productRepo: ProductRepository) {}

  async findAll(filters?: { category?: string; featured?: boolean }): Promise<ProductWithRelations[]> {
    this.logger.log(`Fetching products — filters: ${JSON.stringify(filters ?? {})}`);
    const products = await this.productRepo.findAll(filters);
    this.logger.log(`Returned ${products.length} products`);
    return products;
  }

  async findOne(id: number): Promise<ProductWithRelations> {
    const product = await this.productRepo.findById(id);
    if (!product) {
      this.logger.warn(`Product #${id} not found`);
      throw new NotFoundException(`Product #${id} not found`);
    }
    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<ProductWithRelations> {
    this.logger.log(`Creating product — name: "${createProductDto.name}"`);
    const product = await this.productRepo.create(createProductDto as ProductCreateData);
    this.logger.log(`Product created — id: ${product.id}, name: "${product.name}"`);
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<ProductWithRelations> {
    await this.findOne(id);
    this.logger.log(`Updating product #${id} — fields: ${Object.keys(updateProductDto).join(', ')}`);
    const product = await this.productRepo.update(id, updateProductDto as ProductUpdateData);
    this.logger.log(`Product #${id} updated`);
    return product;
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    this.logger.log(`Deleting product #${id}`);
    await this.productRepo.delete(id);
    this.logger.log(`Product #${id} deleted`);
  }

  async removeMany(ids: number[]): Promise<{ deleted: number }> {
    this.logger.log(`Bulk deleting ${ids.length} products: [${ids.join(', ')}]`);
    const result = await this.productRepo.deleteMany(ids);
    this.logger.log(`Bulk delete complete — ${result.count} products removed`);
    return { deleted: result.count };
  }

  async updateImage(id: number, imageUrl: string): Promise<ProductWithRelations> {
    await this.findOne(id);
    this.logger.log(`Updating cover image for product #${id}`);

    await this.productRepo.updateImageUrl(id, imageUrl);

    const firstImg = await this.productRepo.findFirstImage(id);
    if (firstImg) {
      await this.productRepo.updateImage(firstImg.id, { url: imageUrl, sortOrder: 0 });
    } else {
      await this.productRepo.createImage(id, imageUrl, 0);
    }

    this.logger.log(`Cover image updated for product #${id}`);
    return this.findOne(id);
  }

  async addImage(productId: number, url: string) {
    await this.findOne(productId);
    const count = await this.productRepo.countImages(productId);
    this.logger.log(`Adding image to product #${productId} (current count: ${count})`);

    const image = await this.productRepo.createImage(productId, url, count);

    if (count === 0) {
      await this.productRepo.updateImageUrl(productId, url);
      this.logger.log(`First image set as cover for product #${productId}`);
    }

    this.logger.log(`Image #${image.id} added to product #${productId}`);
    return image;
  }

  async removeImage(productId: number, imageId: number): Promise<{ deleted: number }> {
    const image = await this.productRepo.findImageById(imageId);
    if (!image || image.productId !== productId) {
      this.logger.warn(`Image #${imageId} not found for product #${productId}`);
      throw new NotFoundException('Imagen no encontrada');
    }

    this.logger.log(`Removing image #${imageId} from product #${productId}`);
    await this.productRepo.deleteImage(imageId);

    const first = await this.productRepo.findFirstImage(productId);
    await this.productRepo.updateImageUrl(productId, first?.url ?? null);

    this.logger.log(`Image #${imageId} removed — new cover: ${first?.url ?? 'none'}`);
    return { deleted: imageId };
  }
}
