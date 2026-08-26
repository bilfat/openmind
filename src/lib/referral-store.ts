import { ReferralCode, ReferralStatus } from "@/data/referrals";

export function generateRandomReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `OM26${randomPart}`;
}

function parseDateSafe(dateStr: string): number {
  if (!dateStr) return NaN;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getTime();
  const iso = dateStr.replace(" ", "T") + (dateStr.includes("Z") ? "" : "Z");
  const d2 = new Date(iso);
  return isNaN(d2.getTime()) ? NaN : d2.getTime();
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

  if (
    referral.usageLimit !== undefined &&
    referral.usageLimit > 0 &&
    referral.usedCount >= referral.usageLimit
  ) {
    return "EXHAUSTED";
  }

  const now = Date.now();

  if (referral.startDate) {
    const start = parseDateSafe(referral.startDate);
    if (!isNaN(start) && now < start) {
      return "UPCOMING";
    }
  }

  if (referral.endDate) {
    const end = parseDateSafe(referral.endDate);
    if (!isNaN(end) && now > end) {
      return "EXPIRED";
    }
  }

  return "ACTIVE";
}

export async function getStoredReferrals(): Promise<ReferralCode[]> {
  try {
    const res = await fetch("/api/admin/referrals?limit=100", { credentials: "include" });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.clone().json()).message || ''; } catch { /* ignore */ }
      console.error(`[referral-store] getStoredReferrals failed: ${res.status} ${res.statusText} ${detail ? '- ' + detail : ''}`);
      return [];
    }
    const data = await res.json();
    return data.items ?? [];
  } catch (err) {
    console.error("[referral-store] getStoredReferrals network error:", err);
    return [];
  }
}

export async function getReferralById(id: string): Promise<ReferralCode | null> {
  try {
    const res = await fetch(`/api/admin/referrals/${encodeURIComponent(id)}`, { credentials: "include" });
    if (!res.ok) {
      console.error(`[referral-store] getReferralById failed for ${id}: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return data.item ?? null;
  } catch (err) {
    console.error(`[referral-store] getReferralById network error for ${id}:`, err);
    return null;
  }
}

export async function getReferralByCode(code: string): Promise<ReferralCode | null> {
  const clean = code.trim().toUpperCase();
  try {
    const res = await fetch(`/api/admin/referrals?search=${encodeURIComponent(clean)}&limit=10`, { credentials: "include" });
    if (!res.ok) {
      console.error(`[referral-store] getReferralByCode failed for ${clean}: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    const items: ReferralCode[] = data.items ?? [];
    return items.find((r) => r.code.toUpperCase() === clean) ?? null;
  } catch (err) {
    console.error(`[referral-store] getReferralByCode network error for ${clean}:`, err);
    return null;
  }
}

export async function createNewReferral(
  data: Omit<ReferralCode, "id" | "usedCount" | "createdAt"> & { id?: string }
): Promise<ReferralCode> {
  const payload = {
    code: data.code.trim().toUpperCase(),
    discount_type: data.discountType,
    discount_value: data.discountValue,
    max_discount: data.maxDiscount ?? null,
    usage_limit: data.usageLimit ?? null,
    start_at: data.startDate,
    end_at: data.endDate,
    status: data.status,
    description: data.description ?? null,
    is_public: data.isPublic ?? false,
  };

  const res = await fetch("/api/admin/referrals", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Gagal membuat kode referal." }));
    throw new Error(err.message || "Gagal membuat kode referal.");
  }

  const result = await res.json();
  return result.item;
}

export async function updateExistingReferral(
  id: string,
  data: Partial<ReferralCode>
): Promise<ReferralCode | null> {
  const payload: Record<string, unknown> = {};
  if (data.code !== undefined) payload.code = data.code.trim().toUpperCase();
  if (data.discountType !== undefined) payload.discount_type = data.discountType;
  if (data.discountValue !== undefined) payload.discount_value = data.discountValue;
  if (data.maxDiscount !== undefined) payload.max_discount = data.maxDiscount ?? null;
  if (data.usageLimit !== undefined) payload.usage_limit = data.usageLimit ?? null;
  if (data.startDate !== undefined) payload.start_at = data.startDate;
  if (data.endDate !== undefined) payload.end_at = data.endDate;
  if (data.status !== undefined) payload.status = data.status;
  if (data.description !== undefined) payload.description = data.description ?? null;
  if (data.isPublic !== undefined) payload.is_public = data.isPublic;

  try {
    const res = await fetch(`/api/admin/referrals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Gagal memperbarui kode referal." }));
      throw new Error(err.message || "Gagal memperbarui kode referal.");
    }
    const result = await res.json();
    return result.item ?? null;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error("Gagal memperbarui kode referal.");
  }
}

export async function setReferralStatus(id: string, status: ReferralStatus): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/referrals/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function archiveReferral(id: string): Promise<boolean> {
  return setReferralStatus(id, "ARCHIVED");
}
