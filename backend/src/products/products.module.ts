import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductRepository } from './repositories/product.repository';
import { PrismaProductRepository } from './repositories/prisma-product.repository';

@Module({
  imports: [
    MulterModule.register({ dest: './uploads/products' }),
  ],
  providers: [
    ProductsService,
    { provide: ProductRepository, useClass: PrismaProductRepository },
  ],
  controllers: [ProductsController],
  exports: [ProductsService, ProductRepository],
})
export class ProductsModule {}
