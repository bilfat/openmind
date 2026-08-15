"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ReferralCode, ReferralStatus, DiscountType } from "@/data/referrals";
import {
  createNewReferral,
  updateExistingReferral,
  generateRandomReferralCode,
  getReferralByCode,
} from "@/lib/referral-store";
import { ReferralPreview } from "./referral-preview";
import {
  Tag,
  Sparkles,
  ArrowLeft,
  Save,
  Wand2,
  AlertCircle,
  Calendar,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralFormProps {
  initialData?: ReferralCode;
  isEdit?: boolean;
}

export function ReferralForm({ initialData, isEdit = false }: ReferralFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    discountType: initialData?.discountType || ("PERCENTAGE" as DiscountType),
    discountValue: initialData?.discountValue || 20,
    maxDiscount: initialData?.maxDiscount || undefined,
    usageLimit: initialData?.usageLimit || 100,
    usedCount: initialData?.usedCount || 0,
    startDate: initialData?.startDate || "2026-08-01T00:00",
    endDate: initialData?.endDate || "2026-09-17T23:59",
    status: initialData?.status || ("ACTIVE" as ReferralStatus),
    description: initialData?.description || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  type FormData = {
    code: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscount?: number;
    usageLimit: number;
    usedCount: number;
    startDate: string;
    endDate: string;
    status: ReferralStatus;
    description: string;
  };

  const handleChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateCode = () => {
    const generated = generateRandomReferralCode();
    handleChange("code", generated);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.code;
      return next;
    });
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    const cleanCode = formData.code.trim().toUpperCase();

    if (!cleanCode) {
      err.code = "Kode referal wajib diisi.";
    } else if (cleanCode.length < 4 || cleanCode.length > 20) {
      err.code = "Kode referal harus antara 4 hingga 20 karakter.";
    } else if (!/^[A-Z0-9]+$/.test(cleanCode)) {
      err.code = "Kode referal hanya boleh berisi huruf kapital dan angka tanpa spasi.";
    } else if (!isEdit) {
      const existing = getReferralByCode(cleanCode);
      if (existing) {
        err.code = "Kode referal sudah digunakan. Gunakan kode lain.";
      }
    }

    if (formData.discountType === "PERCENTAGE") {
      if (formData.discountValue <= 0 || formData.discountValue > 100) {
        err.discountValue = "Nilai diskon persentase harus antara 1% hingga 100%.";
      }
    } else {
      if (formData.discountValue <= 0) {
        err.discountValue = "Nilai potongan harga harus lebih besar dari Rp 0.";
      }
    }

    if (!formData.usageLimit || formData.usageLimit < 1) {
      err.usageLimit = "Total kuota penggunaan minimal 1 kali.";
    } else if (isEdit && initialData && formData.usageLimit < initialData.usedCount) {
      err.usageLimit = `Kuota tidak boleh lebih kecil dari jumlah yang telah digunakan (${initialData.usedCount} kali).`;
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate).getTime();
      const end = new Date(formData.endDate).getTime();
      if (end <= start) {
        err.validity = "Tanggal berakhir harus setelah tanggal mulai.";
      }
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (targetStatus: ReferralStatus = "ACTIVE") => {
    if (!validate()) return;
    setIsSubmitting(true);

    const payload = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      status: targetStatus,
    };

    setTimeout(() => {
      if (isEdit && initialData) {
        updateExistingReferral(initialData.id, payload);
        router.push(`/admin/referrals/${initialData.id}`);
      } else {
        const created = createNewReferral(payload);
        router.push(`/admin/referrals/${created.id}`);
      }
    }, 600);
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      router.push("/admin/referrals");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-2xl border border-border p-2.5 hover:bg-secondary text-navy-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
              {isEdit ? "PERBARUI PROMO" : "SUPER ADMIN / PROMO BUILDER"}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
              {isEdit ? `Edit: ${initialData?.code}` : "Buat Kode Referal Baru"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-2xl border border-border px-4 py-2.5 text-xs font-semibold text-navy-900 hover:bg-secondary transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("DRAFT")}
            disabled={isSubmitting}
            className="rounded-2xl border border-gold-500/40 bg-gold-500/10 px-4 py-2.5 text-xs font-bold text-gold-700 hover:bg-gold-500/20 transition-colors"
          >
            Simpan Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(formData.status)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isEdit ? "Simpan Perubahan" : "Aktifkan Kode"}</span>
          </button>
        </div>
      </div>

      {/* Main 60:40 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 60%: Form Sections */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: CODE INFORMATION */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              1. Kode Referal & Deskripsi
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900">
                  Kode Promo / Referal *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-600 hover:text-gold-500 underline"
                >
                  <Wand2 className="h-3 w-3" />
                  <span>Auto-Generate</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="Contoh: OPENMIND50 atau HIPMI25"
                value={formData.code}
                onChange={(e) =>
                  handleChange("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                className={cn(
                  "w-full rounded-xl border bg-secondary/20 py-3 px-4 text-xs font-mono font-bold tracking-wider text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none",
                  errors.code ? "border-destructive ring-1 ring-destructive" : "border-border"
                )}
              />
              {errors.code && (
                <p className="mt-1 text-xs text-destructive">{errors.code}</p>
              )}
              <span className="text-[10px] text-muted-foreground block mt-1">
                Gunakan 4–20 karakter huruf kapital dan angka tanpa spasi.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                Keterangan / Catatan Program Promo <span className="font-normal normal-case text-muted-foreground">(Opsional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Catatan internal atau peruntukan kode promo ini..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/20 p-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* SECTION 2: DISCOUNT CONFIGURATION */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              2. Konfigurasi Nilai Diskon
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleChange("discountType", "PERCENTAGE")}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition-all space-y-1",
                  formData.discountType === "PERCENTAGE"
                    ? "border-gold-500 bg-gold-500/10 shadow-sm ring-2 ring-gold-500/20"
                    : "border-border bg-secondary/20 hover:border-gold-500/40"
                )}
              >
                <span className="font-bold text-sm text-navy-900 block">PERSENTASE (%)</span>
                <p className="text-[11px] text-muted-foreground">
                  Diskon berupa potongan sekian persen dari total tagihan tiket.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleChange("discountType", "FIXED")}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition-all space-y-1",
                  formData.discountType === "FIXED"
                    ? "border-gold-500 bg-gold-500/10 shadow-sm ring-2 ring-gold-500/20"
                    : "border-border bg-secondary/20 hover:border-gold-500/40"
                )}
              >
                <span className="font-bold text-sm text-navy-900 block">NOMINAL TETAP (RP)</span>
                <p className="text-[11px] text-muted-foreground">
                  Potongan harga nominal pasti (misal: Rp 25.000).
                </p>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                  Besaran Diskon *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={formData.discountType === "PERCENTAGE" ? 100 : undefined}
                    value={formData.discountValue || ""}
                    onChange={(e) =>
                      handleChange("discountValue", parseFloat(e.target.value) || 0)
                    }
                    className={cn(
                      "w-full rounded-xl border bg-secondary/20 py-3 px-4 text-xs font-bold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none",
                      errors.discountValue ? "border-destructive" : "border-border"
                    )}
                    placeholder={formData.discountType === "PERCENTAGE" ? "50" : "25000"}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    {formData.discountType === "PERCENTAGE" ? "%" : "IDR"}
                  </span>
                </div>
                {errors.discountValue && (
                  <p className="mt-1 text-xs text-destructive">{errors.discountValue}</p>
                )}
              </div>

              {formData.discountType === "PERCENTAGE" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                    Batas Maksimal Diskon (Cap) <span className="font-normal normal-case text-muted-foreground">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={formData.maxDiscount || ""}
                      onChange={(e) =>
                        handleChange("maxDiscount", parseFloat(e.target.value) || undefined)
                      }
                      className="w-full rounded-xl border border-border bg-secondary/20 py-3 pl-10 pr-4 text-xs font-bold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                      placeholder="Contoh: 50000"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: USAGE LIMIT & VALIDITY */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              3. Batas Kuota & Periode Berlaku
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                Batas Maksimal Penggunaan (Usage Limit) *
              </label>
              <input
                type="number"
                min={isEdit && initialData ? initialData.usedCount : 1}
                value={formData.usageLimit || ""}
                onChange={(e) => handleChange("usageLimit", parseInt(e.target.value, 10) || 1)}
                className={cn(
                  "w-full rounded-xl border bg-secondary/20 py-3 px-4 text-xs font-bold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none",
                  errors.usageLimit ? "border-destructive" : "border-border"
                )}
              />
              {errors.usageLimit && (
                <p className="mt-1 text-xs text-destructive">{errors.usageLimit}</p>
              )}
              {isEdit && initialData && (
                <span className="text-[10px] text-muted-foreground block mt-1">
                  Sudah terpakai: {initialData.usedCount} kali.
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                  Mulai Berlaku (Start Date) *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/20 py-3 px-4 text-xs font-medium text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                  Berakhir Pada (End Date) *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/20 py-3 px-4 text-xs font-medium text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
            {errors.validity && (
              <p className="text-xs text-destructive">{errors.validity}</p>
            )}

            {/* Status Switcher */}
            <div className="pt-2 border-t border-border">
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-2">
                Status Kode Referal
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleChange("status", "ACTIVE")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-bold transition-all border",
                    formData.status === "ACTIVE"
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                      : "bg-secondary/30 border-border text-navy-900 hover:bg-secondary"
                  )}
                >
                  ● Active (Bisa Digunakan)
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("status", "INACTIVE")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-bold transition-all border",
                    formData.status === "INACTIVE"
                      ? "bg-amber-600 border-amber-600 text-white shadow-sm"
                      : "bg-secondary/30 border-border text-navy-900 hover:bg-secondary"
                  )}
                >
                  ○ Inactive (Nonaktifkan)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 40%: Live Preview */}
        <div className="lg:col-span-5 sticky top-24">
          <ReferralPreview formData={formData} />
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-4 shadow-2xl">
            <h4 className="font-display text-lg font-bold text-navy-900">
              Perubahan Belum Disimpan
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda memiliki konfigurasi kode referal yang belum disimpan. Apakah Anda yakin ingin membuang perubahan?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-navy-900"
              >
                Tetap di Sini
              </button>
              <button
                type="button"
                onClick={() => router.push("/admin/referrals")}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-white hover:bg-destructive/90 shadow-sm"
              >
                Buang Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
