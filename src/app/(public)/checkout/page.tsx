"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { mockTickets, TicketItem } from "@/data/tickets";
import { StepIndicator } from "@/components/checkout/step-indicator";
import { saveNewOrder, generateNextOrderId } from "@/lib/order-store";
import { OrderItem } from "@/data/orders";
import {
  ShieldCheck,
  Ticket,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building,
  BookOpen,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { getStoredTickets, getTicketById } from "@/lib/ticket-store";
import {
  validateReferralCode,
  incrementReferralUsage,
  ValidationResult,
} from "@/lib/referral-store";
import { Tag, Check, X, RotateCcw, Loader2 } from "lucide-react";

const facultyOptions = [
  { value: "Fakultas Ilmu Terapan", label: "FIT — Fakultas Ilmu Terapan" },
  { value: "Fakultas Industri Kreatif", label: "FIK — Fakultas Industri Kreatif" },
  { value: "Fakultas Informatika", label: "FIF — Fakultas Informatika" },
  { value: "Fakultas Teknik Elektro", label: "FTE — Fakultas Teknik Elektro" },
  { value: "Fakultas Rekayasa Industri", label: "FRI — Fakultas Rekayasa Industri" },
  { value: "Fakultas Ekonomi dan Bisnis", label: "FEB — Fakultas Ekonomi dan Bisnis" },
  { value: "Fakultas Komunikasi Sosial", label: "FKS — Fakultas Komunikasi Sosial" },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ticketParam = searchParams.get("ticket") || "early-bird";
  const qtyParam = parseInt(searchParams.get("qty") || "1", 10);

  const [selectedTicket, setSelectedTicket] = useState<TicketItem>(() =>
    getTicketById(ticketParam) || getStoredTickets()[1] || mockTickets[1]
  );
  const [quantity, setQuantity] = useState<number>(() =>
    Math.max(1, Math.min(5, qtyParam))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Referral Code State
  const [referralInput, setReferralInput] = useState("");
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [appliedReferral, setAppliedReferral] = useState<{
    code: string;
    discountAmount: number;
    description?: string;
  } | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    whatsapp: "",
    nim: "",
    faculty: "Fakultas Ilmu Terapan",
    studyProgram: "",
    instagram: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isFree = selectedTicket.type === "FREE";
  const unitPrice = isFree ? 0 : selectedTicket.finalPrice ?? selectedTicket.price;
  const subtotalPrice = unitPrice * quantity;
  const referralDiscount = !isFree && appliedReferral ? appliedReferral.discountAmount : 0;
  const finalTotalPrice = Math.max(0, subtotalPrice - referralDiscount);

  const handleApplyReferral = () => {
    const cleanCode = referralInput.trim().toUpperCase();
    if (!cleanCode) return;

    if (isFree) {
      setReferralError("Tiket ini gratis. Kode promo hanya dapat digunakan untuk tiket berbayar.");
      return;
    }

    setIsValidatingReferral(true);
    setReferralError(null);

    setTimeout(() => {
      const result: ValidationResult = validateReferralCode(cleanCode, subtotalPrice);
      setIsValidatingReferral(false);

      if (result.isValid && result.discountAmount > 0) {
        setAppliedReferral({
          code: cleanCode,
          discountAmount: result.discountAmount,
          description: result.referral?.description,
        });
        setReferralInput("");
      } else {
        setReferralError(result.message);
      }
    }, 500);
  };

  const handleRemoveReferral = () => {
    setAppliedReferral(null);
    setReferralError(null);
    setReferralInput("");
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Nama lengkap wajib diisi.";
    if (!formData.email.trim() || !formData.email.includes("@"))
      newErrors.email = "Email valid wajib diisi.";
    if (!formData.whatsapp.trim() || formData.whatsapp.length < 9)
      newErrors.whatsapp = "Nomor WhatsApp aktif wajib diisi.";
    if (!formData.nim.trim()) newErrors.nim = "NIM mahasiswa wajib diisi.";
    if (!formData.faculty) newErrors.faculty = "Fakultas wajib dipilih.";
    if (!formData.studyProgram.trim())
      newErrors.studyProgram = "Program studi wajib diisi.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const orderId = generateNextOrderId();

    // Increment referral usage count if used
    if (appliedReferral) {
      incrementReferralUsage(appliedReferral.code);
    }

    const now = new Date();
    const createdAtStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")} ${String(
      now.getHours()
    ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} WIB`;

    const newOrder: OrderItem = {
      orderId,
      customerName: formData.fullName,
      email: formData.email,
      whatsapp: formData.whatsapp,
      nim: formData.nim,
      faculty: formData.faculty,
      studyProgram: formData.studyProgram,
      instagram: formData.instagram ? `@${formData.instagram.replace("@", "")}` : undefined,
      ticketId: selectedTicket.id,
      ticketName: selectedTicket.name,
      ticketCategory: isFree ? "free" : "paid",
      quantity,
      totalPrice: finalTotalPrice,
      paymentStatus: isFree ? "approved" : "pending",
      paymentMethod: isFree ? "Free Pass" : "Bank BRI Manual Transfer",
      createdAt: createdAtStr,
      checkedIn: false,
    };

    saveNewOrder(newOrder);

    setTimeout(() => {
      if (isFree) {
        router.push(`/success?order=${orderId}&type=free`);
      } else {
        router.push(`/payment?order=${orderId}`);
      }
    }, 600);
  };

  return (
    <div className="pt-24 pb-20">
      {/* Header */}
      <section className="bg-secondary/40 border-b border-border py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900">
            Form Pendaftaran Peserta
          </h1>
          <p className="text-sm sm:text-base text-navy-900/70 max-w-xl mx-auto">
            Isi data diri Anda dengan benar untuk penerbitan E-Ticket OPEN MIND 2026.
          </p>
        </div>
      </section>

      {/* Step Indicator */}
      <StepIndicator currentStep={1} isFree={isFree} />

      {/* Main Form Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left: Registration Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-border bg-white p-6 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-navy-900">
                    Data Diri Peserta
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Semua kolom bertanda bintang (*) wajib diisi
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Tanpa Akun</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                    Nama Lengkap *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Masukkan nama lengkap sesuai identitas"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className={cn(
                        "w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all",
                        errors.fullName ? "border-destructive" : "border-border"
                      )}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>
                  )}
                </div>

                {/* Email & WhatsApp Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                      Email Aktif *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        placeholder="contoh@student.telkomuniversity.ac.id"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className={cn(
                          "w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all",
                          errors.email ? "border-destructive" : "border-border"
                        )}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                      No. WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="tel"
                        placeholder="08123456789"
                        value={formData.whatsapp}
                        onChange={(e) =>
                          setFormData({ ...formData, whatsapp: e.target.value })
                        }
                        className={cn(
                          "w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all",
                          errors.whatsapp ? "border-destructive" : "border-border"
                        )}
                      />
                    </div>
                    {errors.whatsapp && (
                      <p className="mt-1 text-xs text-destructive">{errors.whatsapp}</p>
                    )}
                  </div>
                </div>

                {/* NIM */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                    NIM Mahasiswa *
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Contoh: 6706220014"
                      value={formData.nim}
                      onChange={(e) =>
                        setFormData({ ...formData, nim: e.target.value })
                      }
                      className={cn(
                        "w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all",
                        errors.nim ? "border-destructive" : "border-border"
                      )}
                    />
                  </div>
                  {errors.nim && (
                    <p className="mt-1 text-xs text-destructive">{errors.nim}</p>
                  )}
                </div>

                {/* Fakultas & Program Studi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                      Fakultas *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <select
                        value={formData.faculty}
                        onChange={(e) =>
                          setFormData({ ...formData, faculty: e.target.value })
                        }
                        className="w-full rounded-xl border border-border bg-secondary/20 py-3 pl-10 pr-4 text-sm text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all appearance-none cursor-pointer"
                      >
                        {facultyOptions.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                      Program Studi *
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Contoh: D3 Sistem Informasi"
                        value={formData.studyProgram}
                        onChange={(e) =>
                          setFormData({ ...formData, studyProgram: e.target.value })
                        }
                        className={cn(
                          "w-full rounded-xl border bg-secondary/20 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all",
                          errors.studyProgram ? "border-destructive" : "border-border"
                        )}
                      />
                    </div>
                    {errors.studyProgram && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.studyProgram}
                      </p>
                    )}
                  </div>
                </div>

                {/* Username Instagram (Opsional) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                    Username Instagram <span className="text-muted-foreground normal-case font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="username_instagram"
                      value={formData.instagram}
                      onChange={(e) =>
                        setFormData({ ...formData, instagram: e.target.value })
                      }
                      className="w-full rounded-xl border border-border bg-secondary/20 py-3 pl-8 pr-4 text-sm text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 py-4 text-base font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 hover:scale-[1.01] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Memproses Data Peserta...</span>
                    ) : (
                      <>
                        <span>{isFree ? "Konfirmasi & Dapatkan E-Ticket" : "Lanjut ke Pembayaran"}</span>
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-muted-foreground mt-3">
                    Dengan melanjutkan, Anda menyetujui seluruh syarat & ketentuan tiket OPEN MIND 2026.
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Order Summary Sidebar */}
          <div className="lg:col-span-5 sticky top-28">
            <div className="rounded-3xl border border-gold-500/30 bg-navy-950 p-6 sm:p-8 text-ivory-100 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-navy-800 pb-4">
                <h3 className="font-display text-lg font-bold text-ivory-100 flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-gold-400" />
                  <span>Ringkasan Pesanan</span>
                </h3>
                <Link
                  href="/tiket"
                  className="text-xs font-semibold text-gold-400 hover:text-gold-300 underline"
                >
                  Ubah Tiket
                </Link>
              </div>

              {/* Selected Ticket Preview */}
              <div className="rounded-2xl border border-gold-500/20 bg-navy-900/80 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
                      TIKET TERPILIH
                    </span>
                    <h4 className="font-display text-xl font-bold text-ivory-100">
                      {selectedTicket.name}
                    </h4>
                  </div>
                  <span className="rounded-full bg-gold-500/10 border border-gold-500/30 px-2.5 py-1 text-[11px] font-bold text-gold-400">
                    {quantity} Pax
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs text-ivory-200/70 border-t border-navy-800 pt-3">
                  <span>Harga Satuan:</span>
                  <span className="font-bold text-ivory-100">
                    {isFree
                      ? "Rp 0"
                      : `Rp ${(selectedTicket.finalPrice ?? selectedTicket.price).toLocaleString("id-ID")}`}
                  </span>
                </div>
              </div>

              {/* Promo / Referral Code Box (Only for Paid Tickets) */}
              {!isFree && (
                <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-ivory-100 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-gold-400" />
                      <span>KODE REFERAL / PROMO</span>
                    </span>
                  </div>

                  {!appliedReferral ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Masukkan kode promo..."
                          value={referralInput}
                          onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyReferral();
                            }
                          }}
                          className="flex-1 rounded-xl border border-navy-800 bg-navy-950 px-3.5 py-2.5 text-xs font-mono font-bold tracking-wider text-ivory-100 placeholder:text-ivory-200/40 focus:border-gold-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplyReferral}
                          disabled={isValidatingReferral || !referralInput.trim()}
                          className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all disabled:opacity-40"
                        >
                          {isValidatingReferral ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <span>Terapkan</span>
                          )}
                        </button>
                      </div>
                      {referralError && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{referralError}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-xs text-emerald-400 flex items-center gap-1">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          <span>{appliedReferral.code}</span>
                        </span>
                        <p className="text-[10px] text-emerald-300">
                          Diskon berhasil diterapkan (- Rp {appliedReferral.discountAmount.toLocaleString("id-ID")})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReferral}
                        className="rounded-lg p-1.5 text-ivory-200/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Hapus Promo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cost Calculations */}
              <div className="space-y-2.5 text-sm text-ivory-200/80">
                <div className="flex justify-between">
                  <span>Subtotal ({quantity} tiket):</span>
                  <span>{isFree ? "Rp 0" : `Rp ${subtotalPrice.toLocaleString("id-ID")}`}</span>
                </div>

                {!isFree && appliedReferral && (
                  <div className="flex justify-between text-xs text-emerald-400 font-bold">
                    <span>Potongan Referal ({appliedReferral.code}):</span>
                    <span>- Rp {appliedReferral.discountAmount.toLocaleString("id-ID")}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-ivory-200/60">
                  <span>Biaya Layanan Admin:</span>
                  <span className="text-emerald-400 font-bold">GRATIS (Rp 0)</span>
                </div>

                <div className="border-t border-navy-800 pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-ivory-100">Total Tagihan:</span>
                  <span className="font-display text-2xl font-extrabold text-gold-400">
                    {isFree ? "Rp 0 (GRATIS)" : `Rp ${finalTotalPrice.toLocaleString("id-ID")}`}
                  </span>
                </div>
              </div>

              {/* Free Ticket Note */}
              {isFree ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Tiket gratis langsung terbit dan tidak memerlukan langkah transfer pembayaran.</span>
                </div>
              ) : (
                <div className="rounded-xl bg-gold-500/10 border border-gold-500/20 p-3.5 text-xs text-ivory-200/80 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
                  <span>Pembayaran dilakukan via transfer manual ke Bank BRI resmi panitia pada langkah selanjutnya.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-32 pb-20 text-center">
          <p className="text-sm font-semibold text-gold-600 animate-pulse">
            Memuat Formulir Checkout...
          </p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
