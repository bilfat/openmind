"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { StepIndicator } from "@/components/checkout/step-indicator";
import { OrderItem } from "@/data/orders";
import {
  CheckCircle,
  Copy,
  Check,
  Ticket,
  Home,
  Clock,
  AlertTriangle,
  Sparkles,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/hooks/use-active-event";
import { eventDisplayName } from "@/lib/event-utils";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order") || "OM26-00128";
  const typeParam = searchParams.get("type") || "paid";
  const { event } = useActiveEvent();
  const displayName = eventDisplayName(event);

  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/tickets/public?order_code=${encodeURIComponent(orderId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) setOrder(data.data);
      })
      .catch(() => {});
  }, [orderId]);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFree = typeParam === "free" || order?.ticketCategory === "free";

  return (
    <div className="pt-24 pb-20">
      {/* Step Indicator */}
      <StepIndicator currentStep={3} isFree={isFree} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="rounded-3xl border border-gold-500/40 bg-white p-8 sm:p-12 shadow-xl text-center space-y-8">
          {/* Animated Gold Checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-tr from-gold-500 to-gold-300 text-navy-950 shadow-xl shadow-gold-500/25"
          >
            <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 stroke-[2.5]" />
          </motion.div>

          {/* Headline */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3.5 py-1 text-xs font-bold text-gold-600 uppercase tracking-widest border border-gold-500/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>TRANSAKSI SELESAI</span>
            </span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-navy-900">
              Pendaftaran Berhasil!
            </h1>
            <p className="text-sm sm:text-base text-navy-900/70 max-w-lg mx-auto">
              Terima kasih telah mendaftar di {displayName}. Data pesanan Anda telah tersimpan aman di sistem kami.
            </p>
          </div>

          {/* Prominent Order ID Box */}
          <div className="rounded-3xl border border-gold-500/40 bg-navy-950 p-6 sm:p-8 text-ivory-100 shadow-xl space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />

            <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-400">
              KODE IDENTIFIKASI PESANAN (ORDER ID)
            </span>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
              <span className="font-mono text-3xl sm:text-4xl lg:text-5xl font-black tracking-widest text-gold-300">
                {orderId}
              </span>
              <button
                type="button"
                onClick={handleCopyOrderId}
                className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Salin Order ID</span>
                  </>
                )}
              </button>
            </div>

            {order && (
              <div className="pt-3 border-t border-navy-800 flex flex-wrap items-center justify-center gap-4 text-xs text-ivory-200/70">
                <span>Peserta: <strong className="text-ivory-100">{order.customerName}</strong></span>
                <span>•</span>
                <span>Tiket: <strong className="text-gold-400">{order.ticketName} ({order.quantity} Pax)</strong></span>
              </div>
            )}
          </div>

          {/* Notice Box */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-left text-xs sm:text-sm text-navy-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>PENTING: Simpan Kode Order ID Anda!</span>
            </div>
            <p className="text-xs text-navy-900/80 leading-relaxed font-light">
              Gunakan Order ID di atas untuk melacak status verifikasi pembayaran Anda dan mengakses E-Ticket QR Code pada menu &ldquo;Cek Tiket&rdquo;.
            </p>
          </div>

          {/* Status Details */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-left text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-navy-900">
              <Clock className="h-4 w-4 text-gold-600" />
              <span>Status Tiket:</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
                  isFree
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-orange-500/15 text-orange-700"
                )}
              >
                {isFree ? "Disetujui (Approved)" : "Menunggu Verifikasi (Pending)"}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {isFree
                ? "Tiket Free Pass Anda langsung aktif dan dapat langsung dibuka di halaman Cek Tiket."
                : "Panitia akan melakukan verifikasi struk transfer dalam 1x24 jam. Anda dapat memantau status persetujuan kapan saja."}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href={`/tiket?tab=check&order=${orderId}`}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gold-500 px-8 py-4 text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-lg shadow-gold-500/20 hover:scale-105"
            >
              <Search className="h-4 w-4" />
              <span>Cek Status & E-Ticket</span>
            </Link>

            <Link
              href="/"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border border-border bg-white px-8 py-4 text-sm font-bold text-navy-900 hover:border-gold-500 hover:text-gold-600 transition-all"
            >
              <Home className="h-4 w-4" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-32 pb-20 text-center">
          <p className="text-sm font-semibold text-gold-600 animate-pulse">
            Memuat Konfirmasi Pesanan...
          </p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
