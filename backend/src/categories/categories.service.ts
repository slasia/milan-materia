import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type { Category, Prisma } from '@prisma/client';
import { CategoryRepository, CategoryWithCount } from './repositories/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private categoryRepo: CategoryRepository) {}

  async findAll(): Promise<CategoryWithCount[]> {
    this.logger.log('Fetching active categories');
    const cats = await this.categoryRepo.findAll(true);
    this.logger.log(`Returned ${cats.length} categories`);
    return cats;
  }

  async findAllAdmin(): Promise<CategoryWithCount[]> {
    this.logger.log('Fetching all categories (admin)');
    const cats = await this.categoryRepo.findAll(false);
    this.logger.log(`Returned ${cats.length} categories`);
    return cats;
  }

  async findOne(id: number): Promise<CategoryWithCount> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      this.logger.warn(`Category #${id} not found`);
      throw new NotFoundException(`Category #${id} not found`);
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    this.logger.log(`Creating category — name: "${createCategoryDto.name}", slug: "${createCategoryDto.slug}"`);
    const cat = await this.categoryRepo.create(createCategoryDto as Prisma.CategoryCreateInput);
    this.logger.log(`Category created — id: ${cat.id}`);
    return cat;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    await this.findOne(id);
    this.logger.log(`Updating category #${id}`);
    const cat = await this.categoryRepo.update(id, updateCategoryDto as Prisma.CategoryUpdateInput);
    this.logger.log(`Category #${id} updated`);
    return cat;
  }

  async remove(id: number): Promise<Category> {
    await this.findOne(id);
    this.logger.log(`Deleting category #${id}`);
    const result = await this.categoryRepo.delete(id);
    this.logger.log(`Category #${id} deleted`);
    return result;
  }
}
