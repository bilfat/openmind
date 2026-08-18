"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { StepIndicator } from "@/components/checkout/step-indicator";
import {
  Upload,
  AlertCircle,
  FileImage,
  Trash2,
  ArrowRight,
  QrCode,
  Loader2,
} from "lucide-react";
import { useActiveEvent } from "@/hooks/use-active-event";

interface PublicOrderData {
  id: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  ticketName: string;
  quantity: number;
  totalPrice: number;
  paymentStatus: string;
}

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderIdParam = searchParams.get("order") || "";
  const { event } = useActiveEvent();

  const [order, setOrder] = useState<PublicOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      if (!orderIdParam) {
        setError("Order ID tidak ditemukan di URL.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/tickets/public?order_code=${encodeURIComponent(orderIdParam)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal memuat data pesanan.");
        }
        setOrder(json.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal memuat data pesanan.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderIdParam]);

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

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFile) {
      setUploadError("Harap unggah bukti transfer pembayaran Anda terlebih dahulu.");
      return;
    }

    if (!order || !order.id) {
      setUploadError("Data pesanan tidak valid.");
      return;
    }

    setIsSubmitting(true);
    setUploadError("");

    try {
      // 1. Request signed upload URL
      const urlRes = await fetch('/api/payments/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          fileName: proofFile.name,
          fileType: proofFile.type,
          fileSize: proofFile.size,
        }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData.success) {
        throw new Error(urlData.message || "Gagal mendapatkan URL unggah.");
      }

      // 2. Upload file directly to Supabase storage signed URL
      const uploadRes = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': proofFile.type,
        },
        body: proofFile,
      });

      if (!uploadRes.ok) {
        throw new Error("Gagal mengunggah file ke penyimpanan server.");
      }

      // 3. Submit payment proof to API
      const submitRes = await fetch('/api/payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod: 'QRIS',
          proofPath: urlData.path,
          proofFileName: proofFile.name,
          proofMimeType: proofFile.type,
          proofSizeBytes: proofFile.size,
        }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.success) {
        throw new Error(submitData.message || "Gagal mengirim bukti pembayaran.");
      }

      router.push(`/success?order=${order.orderId}&type=paid`);
    } catch (err: unknown) {
      console.error('Payment submission error:', err);
      setUploadError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses pembayaran.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-32 pb-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gold-500 mb-2" />
        <p className="text-sm font-semibold text-gold-600">Memuat Halaman Pembayaran...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="pt-32 pb-20 text-center max-w-md mx-auto px-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
        <h2 className="font-display text-xl font-bold text-navy-900 mb-1">Pesanan Tidak Ditemukan</h2>
        <p className="text-xs text-muted-foreground mb-4">{error || "Pastikan tautan atau Order ID Anda benar."}</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20">
      {/* Header */}
      <section className="bg-secondary/40 border-b border-border py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900">
            Instruksi Pembayaran
          </h1>
          <p className="text-sm sm:text-base text-navy-900/70 max-w-xl mx-auto">
            Scan QRIS dan unggah foto bukti transfer pembayaran di bawah.
          </p>
        </div>
      </section>

      {/* Step Indicator */}
      <StepIndicator currentStep={2} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="space-y-8">
          {/* Order Brief Info (Source of Truth Banner) */}
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
                TOTAL YANG HARUS DIBAYAR
              </span>
              <p className="font-display text-3xl font-extrabold text-gold-400">
                Rp {order.totalPrice.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          {/* QRIS Payment Section */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10 text-gold-600">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-navy-900">
                  Metode Pembayaran QRIS
                </h3>
                <p className="text-xs text-muted-foreground">
                  Scan kode QRIS di bawah menggunakan GoPay, OVO, Dana, LinkAja, ShopeePay, atau mobile banking Anda.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-secondary/30 border border-border p-6 rounded-2xl gap-4">
              <div className="relative bg-white p-4 rounded-xl shadow-sm max-w-xs w-full border border-border">
                <img
                  src={event?.qris_image_url || "/qris.png"}
                  alt="QRIS Pembayaran"
                  className="w-full h-auto object-contain mx-auto rounded-lg"
                />
              </div>
              <div className="text-center space-y-1.5 max-w-sm">
                <p className="text-sm font-bold text-navy-900">Scan QRIS Untuk Menyelesaikan Transaksi</p>
                <p className="text-xs text-muted-foreground">
                  Pastikan nominal pembayaran sesuai dengan total tagihan (Rp {order.totalPrice.toLocaleString("id-ID")}), lalu screenshot/foto struk untuk diunggah sebagai bukti transfer di bawah.
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
                  Unggah screenshot bukti pembayaran m-Banking / QRIS Anda
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
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
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
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Mengunggah & Memproses...</span>
                  </>
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
