export type DiscountType = "PERCENTAGE" | "FIXED";

export type ReferralStatus =
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "EXPIRED"
  | "EXHAUSTED"
  | "ARCHIVED";

export interface ReferralCode {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: ReferralStatus;
  description?: string;
  createdAt: string;
  eventId?: string;
}

export const initialReferralCodes: ReferralCode[] = [];
