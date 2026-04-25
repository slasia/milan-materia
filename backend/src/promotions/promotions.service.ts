import { Injectable, NotFoundException } from '@nestjs/common';
import type { Promotion, Prisma } from '@prisma/client';
import { PromotionRepository } from './repositories/promotion.repository';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

export type PromoValidationResult =
  | { valid: false; message: string }
  | { valid: true; discountAmount: number; promotionId: number; discountPct: number | null; title: string };

@Injectable()
export class PromotionsService {
  constructor(private promotionRepo: PromotionRepository) {}

  async getActive(type?: string): Promise<Promotion[]> {
    return this.promotionRepo.findAll({ activeOnly: true, type });
  }

  async findAll(): Promise<Promotion[]> {
    return this.promotionRepo.findAll();
  }

  async findOne(id: number): Promise<Promotion> {
    const promotion = await this.promotionRepo.findById(id);
    if (!promotion) throw new NotFoundException(`Promotion #${id} not found`);
    return promotion;
  }

  async validateCode(code: string, cartTotal: number): Promise<PromoValidationResult> {
    const promotion = await this.promotionRepo.findByCode(code);

    if (!promotion || !promotion.active) {
      return { valid: false, message: 'Código inválido o inactivo' };
    }

    const now = new Date();
    if (promotion.startsAt && promotion.startsAt > now) {
      return { valid: false, message: 'El código todavía no está activo' };
    }
    if (promotion.endsAt && promotion.endsAt < now) {
      return { valid: false, message: 'El código ha expirado' };
    }
    if (promotion.maxUses && promotion.usedCount >= promotion.maxUses) {
      return { valid: false, message: 'El código ha alcanzado su límite de usos' };
    }
    if (promotion.minCartAmt && cartTotal < promotion.minCartAmt) {
      return {
        valid: false,
        message: `El mínimo de compra para este código es ${promotion.minCartAmt}`,
      };
    }

    let discountAmount = 0;
    if (promotion.discountPct) {
      discountAmount = Math.floor((cartTotal * promotion.discountPct) / 100);
    } else if (promotion.discountAmt) {
      discountAmount = promotion.discountAmt;
    }

    return {
      valid: true,
      discountAmount,
      promotionId: promotion.id,
      discountPct: promotion.discountPct,
      title: promotion.title,
    };
  }

  async create(createPromotionDto: CreatePromotionDto): Promise<Promotion> {
    return this.promotionRepo.create(createPromotionDto as Prisma.PromotionCreateInput);
  }

  async update(id: number, updatePromotionDto: UpdatePromotionDto): Promise<Promotion> {
    await this.findOne(id);
    return this.promotionRepo.update(id, updatePromotionDto as Prisma.PromotionUpdateInput);
  }

  async remove(id: number): Promise<Promotion> {
    await this.findOne(id);
    return this.promotionRepo.delete(id);
  }
}
