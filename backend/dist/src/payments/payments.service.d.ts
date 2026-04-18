import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class PaymentsService {
    private configService;
    private prisma;
    private promotionsService;
    private mpClient;
    constructor(configService: ConfigService, prisma: PrismaService, promotionsService: PromotionsService);
    createCheckoutSession(dto: CreateCheckoutDto): Promise<{
        preferenceId: string;
        url: string;
        sandboxUrl: string;
        orderId: number;
    }>;
    handleWebhook(type: string, paymentId: string): Promise<{
        received: boolean;
    }>;
}
