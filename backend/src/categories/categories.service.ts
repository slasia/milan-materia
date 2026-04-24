import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    console.log('[SHOP] Fetching active categories');
    const cats = await this.prisma.category.findMany({
      where: { active: true },
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    console.log(`[SHOP] Returned ${cats.length} categories`);
    return cats;
  }

  async findAllAdmin() {
    console.log('[ADMIN] Fetching all categories');
    const cats = await this.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    console.log(`[ADMIN] Returned ${cats.length} categories`);
    return cats;
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) {
      console.warn(`[ADMIN] Category #${id} not found`);
      throw new NotFoundException(`Category #${id} not found`);
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto) {
    console.log(`[ADMIN] Creating category — name: "${createCategoryDto.name}", slug: "${createCategoryDto.slug}"`);
    const cat = await this.prisma.category.create({ data: createCategoryDto });
    console.log(`[ADMIN] Category created — id: ${cat.id}`);
    return cat;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);
    console.log(`[ADMIN] Updating category #${id}`);
    const cat = await this.prisma.category.update({ where: { id }, data: updateCategoryDto });
    console.log(`[ADMIN] Category #${id} updated`);
    return cat;
  }

  async remove(id: number) {
    await this.findOne(id);
    console.log(`[ADMIN] Deleting category #${id}`);
    const result = await this.prisma.category.delete({ where: { id } });
    console.log(`[ADMIN] Category #${id} deleted`);
    return result;
  }
}
