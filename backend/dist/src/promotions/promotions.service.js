"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PromotionsService = class PromotionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getActive(type) {
        const where = { active: true };
        if (type)
            where.type = type;
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
    async findOne(id) {
        const promotion = await this.prisma.promotion.findUnique({ where: { id } });
        if (!promotion)
            throw new common_1.NotFoundException(`Promotion #${id} not found`);
        return promotion;
    }
    async validateCode(code, cartTotal) {
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
        }
        else if (promotion.discountAmt) {
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
    create(createPromotionDto) {
        return this.prisma.promotion.create({ data: createPromotionDto });
    }
    async update(id, updatePromotionDto) {
        await this.findOne(id);
        return this.prisma.promotion.update({ where: { id }, data: updatePromotionDto });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.promotion.delete({ where: { id } });
    }
};
exports.PromotionsService = PromotionsService;
exports.PromotionsService = PromotionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PromotionsService);
//# sourceMappingURL=promotions.service.js.map