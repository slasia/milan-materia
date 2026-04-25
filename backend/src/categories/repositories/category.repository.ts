import type { Category, Prisma } from '@prisma/client';

export type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

export abstract class CategoryRepository {
  abstract findAll(activeOnly?: boolean): Promise<CategoryWithCount[]>;
  abstract findById(id: number): Promise<CategoryWithCount | null>;
  abstract create(data: Prisma.CategoryCreateInput): Promise<Category>;
  abstract update(id: number, data: Prisma.CategoryUpdateInput): Promise<Category>;
  abstract delete(id: number): Promise<Category>;
}
