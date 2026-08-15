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
  code: string; // Uppercase, alphanumeric, 4-20 chars
  discountType: DiscountType;
  discountValue: number; // e.g. 50 (%) or 25000 (IDR)
  maxDiscount?: number; // Cap diskon maksimal (untuk percentage)
  usageLimit?: number; // Total kuota penggunaan
  usedCount: number; // Jumlah yang sudah digunakan
  startDate: string; // ISO format e.g. "2026-08-01T00:00"
  endDate: string; // ISO format e.g. "2026-09-17T23:59"
  status: ReferralStatus;
  description?: string;
  createdAt: string;
}

export const initialReferralCodes: ReferralCode[] = [
  {
    id: "ref-openmind50",
    code: "OPENMIND50",
    discountType: "PERCENTAGE",
    discountValue: 50,
    maxDiscount: 50000,
    usageLimit: 100,
    usedCount: 34,
    startDate: "2026-08-01T00:00",
    endDate: "2026-09-17T23:59",
    status: "ACTIVE",
    description: "Promo diskon 50% spesial kemitraan komunitas wirausaha muda Telkom University.",
    createdAt: "2026-08-01T10:00",
  },
  {
    id: "ref-hipmi25",
    code: "HIPMI25",
    discountType: "PERCENTAGE",
    discountValue: 25,
    usageLimit: 50,
    usedCount: 12,
    startDate: "2026-08-05T00:00",
    endDate: "2026-09-17T23:59",
    status: "ACTIVE",
    description: "Diskon 25% khusus anggota dan jejaring HIPMI Jawa Barat.",
    createdAt: "2026-08-05T14:30",
  },
  {
    id: "ref-earlybird10k",
    code: "POTONGAN10K",
    discountType: "FIXED",
    discountValue: 10000,
    usageLimit: 150,
    usedCount: 40,
    startDate: "2026-08-10T00:00",
    endDate: "2026-09-15T23:59",
    status: "ACTIVE",
    description: "Voucher potongan langsung Rp 10.000 untuk seluruh pembelian tiket berbayar.",
    createdAt: "2026-08-10T09:15",
  },
  {
    id: "ref-vipinvite",
    code: "VIPPARTNER",
    discountType: "PERCENTAGE",
    discountValue: 50,
    maxDiscount: 100000,
    usageLimit: 20,
    usedCount: 20,
    startDate: "2026-08-01T00:00",
    endDate: "2026-09-17T23:59",
    status: "ACTIVE",
    description: "Voucher khusus partner strategis OPEN MIND (Kuota telah habis).",
    createdAt: "2026-08-01T08:00",
  },
];
