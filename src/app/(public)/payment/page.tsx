"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { StepIndicator } from "@/components/checkout/step-indicator";
import { getOrderByOrderId, saveNewOrder } from "@/lib/order-store";
import { OrderItem } from "@/data/orders";
import {
  Copy,
  Check,
  Upload,
  CreditCard,
  Building2,
  AlertCircle,
  FileImage,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderIdParam = searchParams.get("order") || "";

  const [order] = useState<OrderItem | null>(() =>
    orderIdParam ? getOrderByOrderId(orderIdParam) ?? null : null
  );
  const [copied, setCopied] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const bankDetails = {
    bankName: "Bank BRI (Bank Rakyat Indonesia)",
    accountNumber: "1234-5678-9012-345",
    accountName: "HIPMI PT Telkom University",
  };
  const handleCopyAccountNumber = () => {
    navigator.clipboard.writeText(bankDetails.accountNumber.replace(/-/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("File harus berupa gambar (JPG, PNG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Ukuran file maksimal 5MB.");
      return;
    }

    setUploadError("");
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setProofPreview("");
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofPreview && !proofFile) {
      setUploadError("Harap unggah bukti transfer pembayaran Anda terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);

    if (order) {
      const updatedOrder: OrderItem = {
        ...order,
        paymentProofUrl:
          proofPreview ||
          "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop",
        paymentStatus: "pending",
      };
      saveNewOrder(updatedOrder);
    }

    setTimeout(() => {
      router.push(`/success?order=${order?.orderId || orderIdParam}&type=paid`);
    }, 800);
  };

  return (
    <div className="pt-24 pb-20">
      {/* Header */}
      <section className="bg-secondary/40 border-b border-border py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900">
            Instruksi Pembayaran
          </h1>
          <p className="text-sm sm:text-base text-navy-900/70 max-w-xl mx-auto">
            Transfer sesuai nominal tagihan dan unggah foto bukti transfer di bawah.
          </p>
        </div>
      </section>

      {/* Step Indicator */}
      <StepIndicator currentStep={2} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="space-y-8">
          {/* Order Brief Info */}
          {order && (
            <div className="rounded-2xl border border-gold-500/30 bg-navy-950 p-6 text-ivory-100 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400">
                  ORDER ID
                </span>
                <p className="font-display text-2xl font-black text-ivory-100">
                  {order.orderId}
                </p>
                <p className="text-xs text-ivory-200/70 mt-0.5">
                  Peserta: <span className="font-semibold text-ivory-100">{order.customerName}</span> ({order.ticketName} · {order.quantity} Tiket)
                </p>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 border-navy-800 pt-3 sm:pt-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-400">
                  TOTAL TAGIHAN
                </span>
                <p className="font-display text-3xl font-extrabold text-gold-400">
                  Rp {order.totalPrice.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          )}

          {/* Bank Account Info Card */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-navy-900">
                  Rekening Tujuan Transfer
                </h3>
                <p className="text-xs text-muted-foreground">
                  Transfer manual melalui ATM / Mobile Banking / Internet Banking
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-secondary/30 border border-border p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Nama Bank
                  </span>
                  <p className="text-base font-bold text-navy-900">
                    {bankDetails.bankName}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 border border-gold-500/20">
                  <span>Akun Resmi Panitia</span>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Nomor Rekening
                </span>
                <div className="mt-1 flex items-center justify-between gap-3 bg-white rounded-xl border border-border p-3">
                  <span className="font-mono text-lg sm:text-xl font-bold tracking-wider text-navy-900">
                    {bankDetails.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAccountNumber}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3.5 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin No. Rekening</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Atas Nama
                </span>
                <p className="text-sm font-bold text-navy-900">
                  {bankDetails.accountName}
                </p>
              </div>
            </div>
          </div>

          {/* Upload Proof Card */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-navy-900">
                  Upload Bukti Transfer
                </h3>
                <p className="text-xs text-muted-foreground">
                  Unggah struk ATM / screenshot bukti pembayaran m-Banking Anda
                </p>
              </div>
            </div>

            {!proofPreview ? (
              <label className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 sm:p-12 hover:border-gold-500 hover:bg-secondary/20 transition-all cursor-pointer group">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-600 group-hover:scale-110 transition-transform">
                  <FileImage className="h-7 w-7" />
                </div>
                <p className="mt-4 text-sm font-bold text-navy-900">
                  Klik untuk memilih file atau seret file ke sini
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Mendukung format JPG, PNG, WEBP (Maksimal 5MB)
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="rounded-2xl border border-border bg-secondary/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span>Bukti Transfer Terpilih: {proofFile?.name || "bukti-transfer.jpg"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Ganti Foto</span>
                  </button>
                </div>

                <div className="relative aspect-[16/9] max-h-64 w-full rounded-xl overflow-hidden border border-border bg-white">
                  <Image
                    src={proofPreview}
                    alt="Pratinjau Bukti Transfer"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubmitPayment}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 py-4 text-base font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 hover:scale-[1.01] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Mengunggah & Memproses...</span>
                ) : (
                  <>
                    <span>Kirim Bukti Pembayaran</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-32 pb-20 text-center">
          <p className="text-sm font-semibold text-gold-600 animate-pulse">
            Memuat Halaman Pembayaran...
          </p>
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
