import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class PaymentsController {
    private paymentsService;
    constructor(paymentsService: PaymentsService);
    createCheckoutSession(dto: CreateCheckoutDto): Promise<{
        preferenceId: any;
        url: any;
        sandboxUrl: any;
        orderId: number;
    }>;
    handleWebhook(type: string, paymentId: string, body: any): Promise<{
        received: boolean;
    }>;
}
