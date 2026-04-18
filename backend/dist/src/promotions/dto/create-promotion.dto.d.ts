export declare class CreatePromotionDto {
    type: string;
    title: string;
    description?: string;
    code?: string;
    discountPct?: number;
    discountAmt?: number;
    minCartAmt?: number;
    maxUses?: number;
    active?: boolean;
    startsAt?: string;
    endsAt?: string;
}
