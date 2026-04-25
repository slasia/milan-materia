import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoryRepository } from './repositories/category.repository';
import { PrismaCategoryRepository } from './repositories/prisma-category.repository';

@Module({
  providers: [
    CategoriesService,
    { provide: CategoryRepository, useClass: PrismaCategoryRepository },
  ],
  controllers: [CategoriesController],
  exports: [CategoriesService, CategoryRepository],
})
export class CategoriesModule {}
