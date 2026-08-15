import {
  ReferralCode,
  initialReferralCodes,
  ReferralStatus,
} from "@/data/referrals";

const STORAGE_KEY = "open_mind_referrals_2026";

export function generateRandomReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OM26${randomPart}`;
}

export function getDerivedReferralStatus(
  referral: ReferralCode
): ReferralStatus | "UPCOMING" {
  if (
    referral.status === "ARCHIVED" ||
    referral.status === "DRAFT" ||
    referral.status === "INACTIVE"
  ) {
    return referral.status;
  }

  // Check quota limit
  if (
    referral.usageLimit !== undefined &&
    referral.usageLimit > 0 &&
    referral.usedCount >= referral.usageLimit
  ) {
    return "EXHAUSTED";
  }

  const now = Date.now();

  // Check Start Date
  if (referral.startDate) {
    const start = new Date(referral.startDate).getTime();
    if (!isNaN(start) && now < start) {
      return "UPCOMING";
    }
  }

  // Check End Date
  if (referral.endDate) {
    const end = new Date(referral.endDate).getTime();
    if (!isNaN(end) && now > end) {
      return "EXPIRED";
    }
  }

  return "ACTIVE";
}

export function getStoredReferrals(): ReferralCode[] {
  if (typeof window === "undefined") return initialReferralCodes;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialReferralCodes));
      return initialReferralCodes;
    }
    return JSON.parse(raw);
  } catch {
    return initialReferralCodes;
  }
}

export function saveReferrals(referrals: ReferralCode[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(referrals));
}

export function getReferralById(id: string): ReferralCode | null {
  const referrals = getStoredReferrals();
  return referrals.find((r) => r.id.toLowerCase() === id.toLowerCase()) || null;
}

export function getReferralByCode(code: string): ReferralCode | null {
  const referrals = getStoredReferrals();
  const clean = code.trim().toUpperCase();
  return referrals.find((r) => r.code.toUpperCase() === clean) || null;
}

export function createNewReferral(
  data: Omit<ReferralCode, "id" | "usedCount" | "createdAt"> & { id?: string }
): ReferralCode {
  const referrals = getStoredReferrals();
  const cleanCode = data.code.trim().toUpperCase();

  const id =
    data.id ||
    `ref-${cleanCode.toLowerCase()}-${Date.now().toString().slice(-4)}`;

  const now = new Date();
  const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")} ${String(
    now.getHours()
  ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const newReferral: ReferralCode = {
    ...data,
    id,
    code: cleanCode,
    usedCount: 0,
    createdAt,
  };

  const updated = [newReferral, ...referrals];
  saveReferrals(updated);
  return newReferral;
}

export function updateExistingReferral(
  id: string,
  data: Partial<ReferralCode>
): ReferralCode | null {
  const referrals = getStoredReferrals();
  const index = referrals.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const current = referrals[index];
  const updatedCode = data.code ? data.code.trim().toUpperCase() : current.code;

  const updatedReferral: ReferralCode = {
    ...current,
    ...data,
    code: updatedCode,
  };

  referrals[index] = updatedReferral;
  saveReferrals(referrals);
  return updatedReferral;
}

export function setReferralStatus(id: string, status: ReferralStatus): boolean {
  const referrals = getStoredReferrals();
  const index = referrals.findIndex((r) => r.id === id);
  if (index === -1) return false;

  referrals[index].status = status;
  saveReferrals(referrals);
  return true;
}

export function archiveReferral(id: string): boolean {
  return setReferralStatus(id, "ARCHIVED");
}

export function incrementReferralUsage(code: string): boolean {
  const referrals = getStoredReferrals();
  const clean = code.trim().toUpperCase();
  const index = referrals.findIndex((r) => r.code.toUpperCase() === clean);
  if (index === -1) return false;

  referrals[index].usedCount = (referrals[index].usedCount || 0) + 1;
  saveReferrals(referrals);
  return true;
}

export interface ValidationResult {
  isValid: boolean;
  status:
    | "VALID"
    | "NOT_FOUND"
    | "INACTIVE"
    | "UPCOMING"
    | "EXPIRED"
    | "EXHAUSTED"
    | "FREE_TICKET";
  message: string;
  discountAmount: number;
  finalPrice: number;
  referral?: ReferralCode;
}

export function validateReferralCode(
  code: string,
  totalTicketPrice: number
): ValidationResult {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return {
      isValid: false,
      status: "NOT_FOUND",
      message: "Masukkan kode referal terlebih dahulu.",
      discountAmount: 0,
      finalPrice: totalTicketPrice,
    };
  }

  const referral = getReferralByCode(cleanCode);
  if (!referral) {
    return {
      isValid: false,
      status: "NOT_FOUND",
      message: "Kode referal tidak ditemukan. Periksa kembali kode yang Anda masukkan.",
      discountAmount: 0,
      finalPrice: totalTicketPrice,
    };
  }

  const derived = getDerivedReferralStatus(referral);

  if (derived === "ARCHIVED") {
    return {
      isValid: false,
      status: "NOT_FOUND",
      message: "Kode referal tidak ditemukan.",
      discountAmount: 0,
      finalPrice: totalTicketPrice,
    };
  }

  if (derived === "INACTIVE" || derived === "DRAFT") {
    return {
      isValid: false,
      status: "INACTIVE",
      message: "Kode referal ini sudah tidak aktif.",
      discountAmount: 0,
      finalPrice: totalTicketPrice,
      referral,
    };
  }

  if (derived === "UPCOMING") {
    return {
      isValid: false,
      status: "UPCOMING",
      message: `Kode referal belum dapat digunakan (mulai berlaku ${referral.startDate.replace("T", " ")} WIB).`,
      discountAmount: 0,
      finalPrice: totalTicketPrice,
      referral,
    };
  }

  if (derived === "EXPIRED") {
    return {
      isValid: false,
      status: "EXPIRED",
      message: "Kode referal ini sudah melewati periode penggunaan.",
      discountAmount: 0,
      finalPrice: totalTicketPrice,
      referral,
    };
  }

  if (derived === "EXHAUSTED") {
    return {
      isValid: false,
      status: "EXHAUSTED",
      message: "Kuota penggunaan kode referal ini sudah habis.",
      discountAmount: 0,
      finalPrice: totalTicketPrice,
      referral,
    };
  }

  // Calculate Discount Amount
  if (totalTicketPrice <= 0) {
    return {
      isValid: true,
      status: "FREE_TICKET",
      message: "Kode referal valid, namun tiket ini sudah gratis (Rp 0).",
      discountAmount: 0,
      finalPrice: 0,
      referral,
    };
  }

  let discountAmount = 0;
  if (referral.discountType === "PERCENTAGE") {
    const rawDiscount = (totalTicketPrice * referral.discountValue) / 100;
    discountAmount = referral.maxDiscount
      ? Math.min(rawDiscount, referral.maxDiscount)
      : rawDiscount;
  } else {
    discountAmount = Math.min(totalTicketPrice, referral.discountValue);
  }

  discountAmount = Math.round(discountAmount);
  const finalPrice = Math.max(0, totalTicketPrice - discountAmount);

  return {
    isValid: true,
    status: "VALID",
    message: `Kode referal berhasil digunakan! Anda hemat Rp ${discountAmount.toLocaleString("id-ID")}.`,
    discountAmount,
    finalPrice,
    referral,
  };
}
