import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from '../promotions/promotions.service';
import { MailService } from '../mail/mail.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class PaymentsService {
    private configService;
    private prisma;
    private promotionsService;
    private mail;
    private mpClient;
    constructor(configService: ConfigService, prisma: PrismaService, promotionsService: PromotionsService, mail: MailService);
    createCheckoutSession(dto: CreateCheckoutDto): Promise<{
        preferenceId: any;
        url: any;
        sandboxUrl: any;
        orderId: number;
    }>;
    handleWebhook(type: string, paymentId: string): Promise<{
        received: boolean;
    }>;
}
