"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TicketType } from "@/data/tickets";
import {
  Lock,
  Sparkles,
  Check,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/hooks/use-active-event";
import { eventDisplayName, formatEventDate } from "@/lib/event-utils";

export default function PrivateInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || "";
  const { event } = useActiveEvent();

  const displayName = eventDisplayName(event);
  const dateLabel = event?.event_date ? formatEventDate(event.event_date, false) : "Jumat, 18 Sep 2026";
  const venueLabel = event?.venue || "Telkom University";

  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [derivedStatus, setDerivedStatus] = useState<string>("ACTIVE");

  useEffect(() => {
    async function validateInvite() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/invite/${token}`);
        const json = await res.json();
        if (json.success) {
          const t = json.data;
          setTicket({
            id: t.id,
            name: t.name,
            description: t.description || "",
            type: t.ticket_type,
            quota: Number(t.quota),
            issued: Number(t.quota) - Number(t.remaining_quota || t.quota),
            finalPrice: Number(t.final_price),
            price: Number(t.base_price),
            discountPercentage: Number(t.discount_percentage),
            benefits: t.benefits || []
          });
          setDerivedStatus(json.derived_status || "ACTIVE");
        } else {
          setErrorMsg(json.message || "Tautan undangan tidak valid.");
        }
      } catch (err) {
        console.error("Invite validation error:", err);
        setErrorMsg("Terjadi kesalahan sistem saat memvalidasi tautan.");
      } finally {
        setLoading(false);
      }
    }
    validateInvite();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6 text-gold-400">
        <div className="flex items-center gap-3 text-sm font-bold animate-pulse">
          <Sparkles className="h-5 w-5" />
          <span>Memverifikasi Tautan Undangan Khusus...</span>
        </div>
      </div>
    );
  }

  // State 1: Invalid Token
  if (errorMsg || !ticket) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6 text-ivory-100">
        <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-navy-900/80 p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive border border-destructive/30">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ivory-100">
              Tautan Undangan Tidak Valid
            </h1>
            <p className="text-xs text-ivory-200/70 mt-2 leading-relaxed font-light">
              {errorMsg || "Tautan undangan privat ini tidak ditemukan atau telah diperbarui dengan kode baru oleh panitia OPEN MIND 2026."}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md"
          >
            <Home className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, ticket.quota - ticket.issued);
  const isFree = ticket.type === "FREE";

  // State 2: Sold Out, Paused, or Expired
  if (derivedStatus !== "ACTIVE") {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6 text-ivory-100">
        <div className="w-full max-w-md rounded-3xl border border-amber-500/40 bg-navy-900/80 p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              {ticket.name}
            </span>
            <h1 className="font-display text-2xl font-bold text-ivory-100 mt-1">
              {derivedStatus === "SOLD_OUT" && "Kuota Undangan Telah Habis"}
              {derivedStatus === "PAUSED" && "Pendaftaran Sementara Ditutup"}
              {derivedStatus === "EXPIRED" && "Periode Pendaftaran Kedaluwarsa"}
            </h1>
            <p className="text-xs text-ivory-200/70 mt-2 leading-relaxed font-light">
              {derivedStatus === "SOLD_OUT" &&
                "Seluruh kuota tiket undangan khusus ini telah habis diklaim oleh tamu terdaftar."}
              {derivedStatus === "PAUSED" &&
                "Panitia sedang melakukan penyesuaian pendaftaran. Silakan hubungi helpdesk atau coba beberapa saat lagi."}
              {derivedStatus === "EXPIRED" &&
                "Batas waktu pendaftaran tiket melalui tautan khusus ini telah berakhir."}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md"
          >
            <Home className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </div>
    );
  }

  // State 3: Valid Active Private Ticket
  return (
    <div className="min-h-screen bg-navy-950 py-16 px-4 text-ivory-100 relative overflow-hidden flex flex-col justify-center">
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg mx-auto w-full space-y-6 relative z-10">
        {/* Banner Top */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-bold text-gold-400 border border-gold-500/30">
            <Lock className="h-3 w-3" />
            <span>EXCLUSIVE PRIVATE INVITATION</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-ivory-100">
            {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-ivory-200/70 max-w-sm mx-auto font-light">
            Anda menerima akses pendaftaran khusus tamu undangan untuk tiket <strong>{ticket.name}</strong>.
          </p>
        </div>

        {/* Ticket Voucher Card */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-gold-500/50 bg-navy-900/90 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="border-b border-navy-800 p-6 sm:p-8 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-full bg-gold-500/20 px-3 py-1 text-[10px] font-bold text-gold-400 uppercase tracking-widest border border-gold-500/30">
                  {isFree ? "COMPLIMENTARY PASS" : "SPECIAL VIP PASS"}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-ivory-100 mt-2">
                  {ticket.name}
                </h2>
              </div>
            </div>

            <p className="text-xs text-ivory-200/80 leading-relaxed font-light">
              {ticket.description}
            </p>

            {/* Price */}
            <div className="pt-2 border-t border-navy-800">
              <span className="text-[10px] text-ivory-200/60 uppercase font-bold tracking-wider block mb-0.5">
                Biaya Registrasi:
              </span>
              {isFree ? (
                <div className="font-display text-3xl font-black text-emerald-400">
                  GRATIS <span className="text-xs font-normal text-ivory-200/60">(Rp 0)</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <div className="font-display text-3xl font-black text-gold-400">
                    Rp {ticket.finalPrice.toLocaleString("id-ID")}
                  </div>
                  {ticket.discountPercentage > 0 && (
                    <span className="text-xs text-ivory-200/50 line-through">
                      Rp {ticket.price.toLocaleString("id-ID")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Event Quick Details */}
          <div className="bg-navy-950/60 px-6 sm:px-8 py-4 border-b border-navy-800 grid grid-cols-2 gap-3 text-[11px] text-ivory-200/80">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gold-400 flex-shrink-0" />
              <span>{dateLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gold-400 flex-shrink-0" />
              <span className="truncate">{venueLabel}</span>
            </div>
          </div>

          {/* Benefits Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
                HAK AKSES & BENEFIT EKSKLUSIF:
              </span>
              <ul className="space-y-2 text-xs text-ivory-200/90">
                {ticket.benefits.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5 stroke-[3]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quota Indicator */}
            <div className="rounded-2xl bg-navy-950/80 border border-navy-800 p-3.5 flex items-center justify-between text-xs">
              <span className="text-ivory-200/70">Sisa Kuota Undangan:</span>
              <strong className="text-gold-300 font-bold">
                {remaining} tiket tersedia
              </strong>
            </div>

            {/* Checkout CTA Button */}
            <Link
              href={`/checkout?ticket=${ticket.id}&invite=${token}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 py-4 text-center text-xs sm:text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-xl active:scale-95"
            >
              <span>{isFree ? "KLAIM TIKET UNDANGAN (GRATIS)" : "LANJUT KE PEMBAYARAN TIKET"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <p className="text-center text-[10px] text-ivory-200/40 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-gold-400" />
          <span>Official Event Pass by HIPMI PT Telkom University</span>
        </p>
      </div>
    </div>
  );
}
