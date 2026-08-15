"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getOrderByOrderId } from "@/lib/order-store";
import { OrderItem } from "@/data/orders";
import { ETicketCard } from "@/components/ticket-view/e-ticket-card";
import {
  Ticket,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Search,
  CheckCircle2,
  Home,
  MessageSquare,
} from "lucide-react";
import { contactWhatsApp } from "@/data/social-links";

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = (params?.id as string) || "";

  const [order] = useState<OrderItem | null>(() =>
    ticketId ? getOrderByOrderId(ticketId) ?? null : null
  );
  const loading = false;

  if (loading) {
    return (
      <div className="pt-32 pb-20 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-600 animate-spin">
          <Ticket className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-semibold text-navy-900">
          Memuat E-Ticket Digital...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="pt-32 pb-20 px-4 max-w-lg mx-auto text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            E-Ticket Tidak Ditemukan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tidak ada tiket dengan kode identifikasi &ldquo;{ticketId}&rdquo;.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/tiket?tab=check"
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 shadow-md"
          >
            <Search className="h-4 w-4" />
            <span>Cari Ulang Order ID</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-6 py-3 text-xs font-bold text-navy-900 hover:border-gold-500"
          >
            <Home className="h-4 w-4" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    );
  }

  // If not approved yet
  if (order.paymentStatus === "pending") {
    return (
      <div className="pt-32 pb-20 px-4 max-w-xl mx-auto text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-600">
          <Clock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold uppercase text-orange-700">
            STATUS: PENDING VERIFIKASI
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mt-2">
            E-Ticket Belum Dapat Diakses
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 leading-relaxed max-w-md mx-auto font-light">
            Bukti transfer untuk pesanan <strong className="font-mono text-navy-900">{order.orderId}</strong> sedang dalam proses verifikasi panitia. E-Ticket QR Pass akan aktif otomatis setelah pembayaran disetujui.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={`/tiket?tab=check&order=${order.orderId}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 shadow-md"
          >
            <Search className="h-4 w-4" />
            <span>Pantau Status di Cek Tiket</span>
          </Link>
        </div>
      </div>
    );
  }

  if (order.paymentStatus === "rejected") {
    return (
      <div className="pt-32 pb-20 px-4 max-w-xl mx-auto text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold uppercase text-destructive">
            STATUS: PEMBAYARAN DITOLAK
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mt-2">
            Verifikasi Pembayaran Gagal
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 leading-relaxed max-w-md mx-auto font-light">
            Alasan: {order.rejectReason || "Foto bukti transfer tidak valid."}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={`/payment?order=${order.orderId}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 shadow-md"
          >
            <span>Upload Ulang Bukti Transfer</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20">
      {/* Top Breadcrumb & Action */}
      <div className="max-w-xl mx-auto px-4 mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/tiket?tab=check&order=${order.orderId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-900/70 hover:text-gold-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Pelacak Tiket</span>
        </Link>
        <span className="text-xs text-muted-foreground font-mono">
          {order.orderId}
        </span>
      </div>

      {/* Main E-Ticket Display */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <ETicketCard order={order} />
      </div>
    </div>
  );
}
