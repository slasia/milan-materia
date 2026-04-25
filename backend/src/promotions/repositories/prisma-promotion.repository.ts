import { Injectable } from '@nestjs/common';
import type { Promotion, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PromotionRepository, PromotionFilters } from './promotion.repository';

@Injectable()
export class PrismaPromotionRepository extends PromotionRepository {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findByCode(code: string): Promise<Promotion | null> {
    return this.prisma.promotion.findUnique({ where: { code } });
  }

  async findById(id: number): Promise<Promotion | null> {
    return this.prisma.promotion.findUnique({ where: { id } });
  }

  async findAll(filters?: PromotionFilters): Promise<Promotion[]> {
    const where: Prisma.PromotionWhereInput = {};
    if (filters?.activeOnly) where.active = true;
    if (filters?.type) where.type = filters.type;

    return this.prisma.promotion.findMany({
      where,
      orderBy: { createdAt: filters?.activeOnly ? 'asc' : 'desc' },
    });
  }

  async create(data: Prisma.PromotionCreateInput): Promise<Promotion> {
    return this.prisma.promotion.create({ data });
  }

  async update(id: number, data: Prisma.PromotionUpdateInput): Promise<Promotion> {
    return this.prisma.promotion.update({ where: { id }, data });
  }

  async delete(id: number): Promise<Promotion> {
    return this.prisma.promotion.delete({ where: { id } });
  }
}
