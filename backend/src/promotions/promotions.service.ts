import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  getActive(type?: string) {
    const where: any = { active: true };
    if (type) where.type = type;
    return this.prisma.promotion.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  findAll() {
    return this.prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundException(`Promotion #${id} not found`);
    return promotion;
  }

  async validateCode(code: string, cartTotal: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { code },
    });

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

  create(createPromotionDto: CreatePromotionDto) {
    return this.prisma.promotion.create({ data: createPromotionDto });
  }

  async update(id: number, updatePromotionDto: UpdatePromotionDto) {
    await this.findOne(id);
    return this.prisma.promotion.update({ where: { id }, data: updatePromotionDto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.promotion.delete({ where: { id } });
  }
}
