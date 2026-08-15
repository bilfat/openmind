"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketType, TicketStatus } from "@/data/tickets";
import { TicketPreview } from "./ticket-preview";
import {
  updateExistingTicket,
  createNewTicket,
} from "@/lib/ticket-store";
import {
  Plus,
  Trash2,
  Lock,
  Globe,
  AlertCircle,
  ArrowLeft,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketFormProps {
  initialData?: TicketType;
  isEdit?: boolean;
}

export function TicketForm({ initialData, isEdit = false }: TicketFormProps) {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    type: initialData?.type || ("FREE" as "FREE" | "PAID"),
    visibility: initialData?.visibility || ("PUBLIC" as "PUBLIC" | "PRIVATE"),
    price: initialData?.price || 0,
    discountPercentage: initialData?.discountPercentage || 0,
    finalPrice: initialData?.finalPrice || 0,
    quota: initialData?.quota || 100,
    issued: initialData?.issued || 0,
    minPurchase: initialData?.minPurchase || 1,
    maxPurchase: initialData?.maxPurchase || 5,
    salesStart: initialData?.salesStart || "2026-08-01T00:00",
    salesEnd: initialData?.salesEnd || "2026-09-17T23:59",
    status: initialData?.status || ("ACTIVE" as TicketStatus),
    benefits: initialData?.benefits || [
      "Access to Main Stage OPEN MIND 2026",
      "Official Digital E-Ticket & QR Pass",
      "E-Certificate of Participation",
    ],
  });

  const [newBenefitInput, setNewBenefitInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [priceChangeWarning, setPriceChangeWarning] = useState(false);

  const finalPrice = formData.type === "FREE"
    ? 0
    : Math.round(
        Math.max(0, formData.price) *
          (1 - Math.min(100, Math.max(0, formData.discountPercentage)) / 100)
      );

  const handleChange = (field: string, value: string | number | string[]) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddBenefit = () => {
    if (!newBenefitInput.trim()) return;
    if (formData.benefits.length >= 8) {
      setErrors((prev) => ({ ...prev, benefits: "Maksimal 8 benefit per tiket." }));
      return;
    }
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      benefits: [...prev.benefits, newBenefitInput.trim()],
    }));
    setNewBenefitInput("");
    setErrors((prev) => {
      const next = { ...prev };
      delete next.benefits;
      return next;
    });
  };

  const handleRemoveBenefit = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};

    if (!formData.name.trim()) {
      err.name = "Nama jenis tiket wajib diisi.";
    } else if (formData.name.length < 3 || formData.name.length > 50) {
      err.name = "Nama tiket harus antara 3 hingga 50 karakter.";
    }

    if (formData.type === "PAID" && formData.price <= 0) {
      err.price = "Harga tiket berbayar harus lebih besar dari Rp 0.";
    }

    if (formData.quota < 1) {
      err.quota = "Total kuota minimal 1 tiket.";
    }

    if (isEdit && initialData && formData.quota < initialData.issued) {
      err.quota = `Kuota tidak dapat lebih kecil dari jumlah tiket yang telah diterbitkan (${initialData.issued} tiket).`;
    }

    if (formData.minPurchase < 1) {
      err.purchaseLimit = "Minimal pembelian tiket adalah 1.";
    } else if (formData.maxPurchase < formData.minPurchase) {
      err.purchaseLimit = "Maksimal pembelian tidak boleh lebih kecil dari minimal pembelian.";
    }

    if (formData.salesStart && formData.salesEnd) {
      const start = new Date(formData.salesStart).getTime();
      const end = new Date(formData.salesEnd).getTime();
      if (end <= start) {
        err.salesPeriod = "Tanggal berakhir harus setelah tanggal mulai penjualan.";
      }
    }

    if (formData.benefits.length === 0) {
      err.benefits = "Tambahkan minimal 1 benefit tiket.";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (targetStatus: TicketStatus = "ACTIVE") => {
    if (!validate()) return;

    // If editing price on ticket with existing sales, show confirmation once
    if (
      isEdit &&
      initialData &&
      initialData.issued > 0 &&
      initialData.price !== formData.price &&
      !priceChangeWarning
    ) {
      setPriceChangeWarning(true);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      ...formData,
      finalPrice,
      status: targetStatus,
    };

    setTimeout(() => {
      if (isEdit && initialData) {
        updateExistingTicket(initialData.id, payload);
        router.push(`/admin/tickets/${initialData.id}`);
      } else {
        const created = createNewTicket(payload);
        router.push(`/admin/tickets/${created.id}`);
      }
    }, 600);
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      router.push("/admin/tickets");
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
              {isEdit ? "PERBARUI KONFIGURASI" : "SUPER ADMIN / TICKET BUILDER"}
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
              {isEdit ? `Edit: ${initialData?.name}` : "Buat Jenis Tiket Baru"}
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
            onClick={() => handleSubmit("ACTIVE")}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isEdit ? "Simpan Perubahan" : "Publikasikan Tiket"}</span>
          </button>
        </div>
      </div>

      {/* Main 60:40 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 60%: Form Sections */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              1. Informasi Dasar Tiket
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                Nama Tiket *
              </label>
              <input
                type="text"
                placeholder="Contoh: Early Bird / VIP Pass / Undangan Organisasi"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={cn(
                  "w-full rounded-xl border bg-secondary/20 py-3 px-4 text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none",
                  errors.name ? "border-destructive ring-1 ring-destructive" : "border-border"
                )}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900">
                  Deskripsi Tiket <span className="font-normal normal-case text-muted-foreground">(Opsional)</span>
                </label>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formData.description.length} / 300
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={300}
                placeholder="Jelaskan target peserta dan keistimewaan tiket ini..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/20 p-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* SECTION 2: TICKET TYPE & PRICING */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              2. Tipe Tiket & Pengaturan Harga
            </h3>

            {/* Type Selector (FREE vs PAID) */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleChange("type", "FREE")}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition-all space-y-1",
                  formData.type === "FREE"
                    ? "border-gold-500 bg-gold-500/10 shadow-sm ring-2 ring-gold-500/20"
                    : "border-border bg-secondary/20 hover:border-gold-500/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-navy-900">FREE TICKET</span>
                  <span className="rounded-full bg-emerald-500/15 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                    Rp 0
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Gratis. Peserta langsung mendapatkan tiket tanpa proses transfer uang.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleChange("type", "PAID")}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition-all space-y-1",
                  formData.type === "PAID"
                    ? "border-gold-500 bg-gold-500/10 shadow-sm ring-2 ring-gold-500/20"
                    : "border-border bg-secondary/20 hover:border-gold-500/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-navy-900">PAID TICKET</span>
                  <span className="rounded-full bg-gold-500/20 text-gold-700 px-2 py-0.5 text-[10px] font-bold">
                    Berbayar
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Memerlukan pembayaran transfer rekening bank dan verifikasi panitia.
                </p>
              </button>
            </div>

            {/* Paid Fields */}
            {formData.type === "PAID" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                    Harga Normal (Price) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      Rp
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={formData.price || ""}
                      onChange={(e) => handleChange("price", parseFloat(e.target.value) || 0)}
                      className={cn(
                        "w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4 text-xs font-bold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none",
                        errors.price ? "border-destructive ring-1 ring-destructive" : "border-border"
                      )}
                      placeholder="50000"
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-xs text-destructive">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                    Diskon (%) <span className="font-normal normal-case text-muted-foreground">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.discountPercentage || ""}
                      onChange={(e) =>
                        handleChange(
                          "discountPercentage",
                          Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        )
                      }
                      className="w-full rounded-xl border border-border bg-secondary/20 py-3 pl-4 pr-10 text-xs font-bold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                      placeholder="0"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2 rounded-2xl bg-secondary/40 p-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Harga Akhir Ditagihkan ke Peserta:
                  </span>
                  <strong className="font-display text-xl font-black text-gold-600">
                    Rp {formData.finalPrice.toLocaleString("id-ID")}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: INVENTORY & PURCHASE LIMITS */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              3. Kuota Tiket & Batas Pembelian
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                  Total Kuota Tiket *
                </label>
                <input
                  type="number"
                  min={isEdit && initialData ? initialData.issued : 1}
                  value={formData.quota || ""}
                  onChange={(e) => handleChange("quota", parseInt(e.target.value, 10) || 1)}
                  className={cn(
                    "w-full rounded-xl border bg-secondary/20 py-3 px-4 text-xs font-bold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none",
                    errors.quota ? "border-destructive ring-1 ring-destructive" : "border-border"
                  )}
                />
                {errors.quota && (
                  <p className="mt-1 text-[11px] text-destructive">{errors.quota}</p>
                )}
                {isEdit && initialData && (
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    Terbit: {initialData.issued} tiket
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                  Min. Pembelian (Pax)
                </label>
                <input
                  type="number"
                  min={1}
                  max={formData.maxPurchase}
                  value={formData.minPurchase}
                  onChange={(e) =>
                    handleChange("minPurchase", parseInt(e.target.value, 10) || 1)
                  }
                  className="w-full rounded-xl border border-border bg-secondary/20 py-3 px-4 text-xs font-bold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                  Maks. Pembelian (Pax)
                </label>
                <input
                  type="number"
                  min={formData.minPurchase}
                  max={10}
                  value={formData.maxPurchase}
                  onChange={(e) =>
                    handleChange("maxPurchase", parseInt(e.target.value, 10) || 5)
                  }
                  className="w-full rounded-xl border border-border bg-secondary/20 py-3 px-4 text-xs font-bold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
            {errors.purchaseLimit && (
              <p className="text-xs text-destructive">{errors.purchaseLimit}</p>
            )}
          </div>

          {/* SECTION 4: SALES PERIOD */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              4. Periode Waktu Penjualan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                  Mulai Penjualan (Start) *
                </label>
                <input
                  type="datetime-local"
                  value={formData.salesStart}
                  onChange={(e) => handleChange("salesStart", e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/20 py-3 px-4 text-xs font-medium text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                  Berakhir Penjualan (End) *
                </label>
                <input
                  type="datetime-local"
                  value={formData.salesEnd}
                  onChange={(e) => handleChange("salesEnd", e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/20 py-3 px-4 text-xs font-medium text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
            {errors.salesPeriod && (
              <p className="text-xs text-destructive">{errors.salesPeriod}</p>
            )}
          </div>

          {/* SECTION 5: VISIBILITY */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              5. Visibilitas Akses Tiket
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleChange("visibility", "PUBLIC")}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition-all space-y-1",
                  formData.visibility === "PUBLIC"
                    ? "border-gold-500 bg-gold-500/10 shadow-sm ring-2 ring-gold-500/20"
                    : "border-border bg-secondary/20 hover:border-gold-500/40"
                )}
              >
                <div className="flex items-center gap-2 font-bold text-sm text-navy-900">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>PUBLIC TICKET</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Tampil bebas di katalog publik website OPEN MIND 2026.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleChange("visibility", "PRIVATE")}
                className={cn(
                  "rounded-2xl border-2 p-4 text-left transition-all space-y-1",
                  formData.visibility === "PRIVATE"
                    ? "border-gold-500 bg-gold-500/10 shadow-sm ring-2 ring-gold-500/20"
                    : "border-border bg-secondary/20 hover:border-gold-500/40"
                )}
              >
                <div className="flex items-center gap-2 font-bold text-sm text-navy-900">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span>PRIVATE TICKET</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Hanya bisa diakses melalui link undangan khusus (<code className="font-mono">/invite/[token]</code>).
                </p>
              </button>
            </div>
          </div>

          {/* SECTION 6: BENEFITS */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-bold text-navy-900">
                6. Daftar Benefit Tiket
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {formData.benefits.length} / 8 Benefit
              </span>
            </div>

            <div className="space-y-2.5">
              {formData.benefits.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={b}
                    onChange={(e) => {
                      const updated = [...formData.benefits];
                      updated[idx] = e.target.value;
                      setIsDirty(true);
                      setFormData((prev) => ({ ...prev, benefits: updated }));
                    }}
                    className="flex-1 rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 font-medium focus:border-gold-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(idx)}
                    className="rounded-xl p-2.5 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {formData.benefits.length < 8 && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Ketik benefit baru (misal: VIP Lunch / E-Certificate)..."
                  value={newBenefitInput}
                  onChange={(e) => setNewBenefitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBenefit();
                    }
                  }}
                  className="flex-1 rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-bold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            )}
            {errors.benefits && (
              <p className="text-xs text-destructive">{errors.benefits}</p>
            )}
          </div>
        </div>

        {/* Right 40%: Live Interactive Preview */}
        <div className="lg:col-span-5 sticky top-24">
          <TicketPreview formData={formData} />
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 space-y-4 shadow-2xl">
            <h4 className="font-display text-lg font-bold text-navy-900">
              Perubahan Belum Disimpan
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda memiliki konfigurasi tiket yang belum disimpan. Apakah Anda yakin ingin membuang perubahan?
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
                onClick={() => router.push("/admin/tickets")}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-white hover:bg-destructive/90 shadow-sm"
              >
                Buang Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Change Confirmation Warning Modal (For tickets with existing sales) */}
      {priceChangeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-5 w-5" />
              <h4 className="font-display text-lg font-bold">
                Ubah Harga Tiket yang Sudah Terjual?
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tiket ini telah diterbitkan ke <strong>{initialData?.issued} peserta</strong>. Perubahan harga hanya akan berlaku untuk pembelian berikutnya dan tidak mengubah pesanan peserta yang sudah terbit.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPriceChangeWarning(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setPriceChangeWarning(false);
                  handleSubmit(formData.status);
                }}
                className="rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-navy-950 hover:bg-gold-400 shadow-md"
              >
                Lanjutkan Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
