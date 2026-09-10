"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ETicketCard, ETicketActions } from "@/components/ticket-view/e-ticket-card";
import { OrderItem } from "@/data/orders";
import {
  Ticket,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Search,
  Home,
} from "lucide-react";

interface ETicketOrder extends OrderItem {
  ticketCode?: string;
  qrToken?: string;
  issuedTicketStatus?: string;
}

interface ETicketData {
  orderId: string;
  paymentStatus: "approved" | "pending" | "rejected";
  quantity: number;
  totalPrice: number;
  createdAt?: string;
  rejectReason?: string;
  tickets: ETicketOrder[];
}

export default function TicketDetailPage() {
  const params = useParams();
  const token = (params?.id as string) || "";
  const [data, setData] = useState<ETicketData | null>(null);
  const [loading, setLoading] = useState(() => Boolean(token));

  useEffect(() => {
    let active = true;
    if (!token) return;

    fetch(`/api/tickets/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || "Ticket not found");
        if (active) setData(payload.data);
      })
      .catch(() => {
        if (active) setData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center pt-28 pb-20 text-center bg-navy-950 text-ivory-100">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/20 text-gold-400 ring-1 ring-gold-500/50 shadow-lg shadow-gold-500/20 animate-spin">
          <Ticket className="h-7 w-7 text-gold-400" />
        </div>
        <p className="mt-4 text-lg font-bold text-gold-400">
          Memuat E-Ticket Digital...
        </p>
        <p className="mt-1 text-xs text-ivory-200/80">Mohon tunggu sebentar</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center pt-28 pb-20 px-4 max-w-lg mx-auto text-center space-y-6 bg-navy-950 text-ivory-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ivory-100">
            E-Ticket Tidak Ditemukan
          </h1>
          <p className="text-xs sm:text-sm text-ivory-200/70">
            Tidak ada tiket dengan kode identifikasi &ldquo;{token}&rdquo;.
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
            className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-xs font-bold text-ivory-100 hover:border-gold-500"
          >
            <Home className="h-4 w-4" />
            <span>Beranda</span>
          </Link>
        </div>
      </div>
    );
  }

  // If not approved yet
  if (data.paymentStatus === "pending") {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center pt-28 pb-20 px-4 max-w-xl mx-auto text-center space-y-6 bg-navy-950 text-ivory-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
          <Clock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase text-amber-300 border border-amber-500/30">
            STATUS: PENDING VERIFIKASI
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ivory-100 mt-3">
            E-Ticket Belum Dapat Diakses
          </h1>
          <p className="text-xs sm:text-sm text-ivory-200/80 leading-relaxed max-w-md mx-auto font-light">
            Bukti transfer untuk pesanan <strong className="font-mono text-gold-400">{data.orderId}</strong> sedang dalam proses verifikasi panitia. E-Ticket QR Pass akan aktif otomatis setelah pembayaran disetujui.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={`/tiket?tab=check&order=${data.orderId}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 shadow-md"
          >
            <Search className="h-4 w-4" />
            <span>Pantau Status di Cek Tiket</span>
          </Link>
        </div>
      </div>
    );
  }

  if (data.paymentStatus === "rejected") {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center pt-28 pb-20 px-4 max-w-xl mx-auto text-center space-y-6 bg-navy-950 text-ivory-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <span className="rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold uppercase text-rose-300 border border-rose-500/30">
            STATUS: PEMBAYARAN DITOLAK
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ivory-100 mt-3">
            Verifikasi Pembayaran Gagal
          </h1>
          <p className="text-xs sm:text-sm text-ivory-200/80 leading-relaxed max-w-md mx-auto font-light">
            Alasan: <span className="text-rose-300 font-semibold">{data.rejectReason || "Foto bukti transfer tidak valid."}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={`/payment?order=${data.orderId}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 shadow-md"
          >
            <span>Upload Ulang Bukti Transfer</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 bg-navy-950 min-h-screen text-ivory-100">
      {/* Top Breadcrumb & Action */}
      <div className="max-w-xl mx-auto px-4 mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/tiket?tab=check&order=${data.orderId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-400 hover:text-gold-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gold-400" />
          <span>Kembali ke Pelacak Tiket</span>
        </Link>
        <span className="text-xs text-gold-400 font-mono font-bold">
          {data.orderId}
        </span>
      </div>

      {/* Main E-Ticket Display */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {data.tickets.length > 1 && (
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-ivory-200/60 print:hidden">
            {data.tickets.length} E-Ticket untuk pesanan ini
          </p>
        )}
        <div className="space-y-10">
          {data.tickets.map((ticket, idx) => (
            <ETicketCard
              key={ticket.qrToken || ticket.ticketCode || idx}
              order={ticket}
            />
          ))}
        </div>

        {data.tickets.length > 0 && (
          <div className="mt-10">
            <ETicketActions order={data.tickets[0]} />
          </div>
        )}
      </div>
    </div>
  );
}