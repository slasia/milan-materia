import { Injectable } from '@nestjs/common';
import type { Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryRepository, CategoryWithCount } from './category.repository';

const includeCount = {
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude;

@Injectable()
export class PrismaCategoryRepository extends CategoryRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll(activeOnly = false): Promise<CategoryWithCount[]> {
    return this.prisma.category.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: includeCount,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: number): Promise<CategoryWithCount | null> {
    return this.prisma.category.findUnique({ where: { id }, include: includeCount });
  }

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  async update(id: number, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  async delete(id: number): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }

  async deleteMany(ids: number[]): Promise<{ count: number }> {
    const result = await this.prisma.category.deleteMany({ where: { id: { in: ids } } });
    return { count: result.count };
  }
}
