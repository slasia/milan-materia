import type { Promotion, Prisma } from '@prisma/client';

export type PromotionFilters = {
  activeOnly?: boolean;
  type?: string;
};

export abstract class PromotionRepository {
  abstract findByCode(code: string): Promise<Promotion | null>;
  abstract findById(id: number): Promise<Promotion | null>;
  abstract findAll(filters?: PromotionFilters): Promise<Promotion[]>;
  abstract create(data: Prisma.PromotionCreateInput): Promise<Promotion>;
  abstract update(id: number, data: Prisma.PromotionUpdateInput): Promise<Promotion>;
  abstract delete(id: number): Promise<Promotion>;
}
