"use client";

import React, { useRef } from "react";
import { OrderItem } from "@/data/orders";
import { eventData } from "@/data/event";
import { QRCodeDisplay } from "./qr-code";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Printer,
  Download,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  User,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ETicketCardProps {
  order: OrderItem;
}

export function ETicketCard({ order }: ETicketCardProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const qrPayload = JSON.stringify({
    orderId: order.orderId,
    name: order.customerName,
    nim: order.nim,
    ticket: order.ticketName,
    verified: true,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleAddToCalendar = () => {
    const title = encodeURIComponent("OPEN MIND 2026 — One Action Endless Impact");
    const details = encodeURIComponent(
      `Seminar & Networking Eksklusif HIPMI PT Telkom University.\nOrder ID: ${order.orderId}\nTiket: ${order.ticketName}`
    );
    const location = encodeURIComponent("Telkom University, Bandung");
    const startDate = "20260918T020000Z"; // 09:00 WIB is 02:00 UTC
    const endDate = "20260918T100000Z"; // 17:00 WIB is 10:00 UTC

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
    window.open(googleCalendarUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Printable Voucher Ticket */}
      <div
        ref={printRef}
        className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border-2 border-gold-500/50 bg-navy-950 text-ivory-100 shadow-2xl shadow-black/60 print:shadow-none print:border-black"
      >
        {/* Subtle Background Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Stub */}
        <div className="border-b border-navy-800 p-6 sm:p-8 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-[0.25em] text-gold-400 uppercase">
                OFFICIAL DIGITAL PASS
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black tracking-wider text-ivory-100 mt-0.5">
                OPEN MIND <span className="text-gold-400 font-bold">2026</span>
              </h2>
              <p className="text-xs text-ivory-200/70 italic font-light">
                &ldquo;One Action Endless Impact&rdquo;
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block rounded-full bg-gold-500/20 px-3 py-1 text-[11px] font-bold text-gold-400 border border-gold-500/30 uppercase tracking-wider">
                {order.ticketName}
              </span>
              <p className="font-mono text-xs text-ivory-200/50 mt-1">
                {order.orderId}
              </p>
            </div>
          </div>

          {/* Event Quick Info */}
          <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-navy-900/90 border border-gold-500/20 p-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-ivory-200/80">
              <Calendar className="h-3.5 w-3.5 text-gold-400 flex-shrink-0" />
              <span className="truncate">{eventData.date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-ivory-200/80">
              <Clock className="h-3.5 w-3.5 text-gold-400 flex-shrink-0" />
              <span className="truncate">{eventData.time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-ivory-200/80">
              <MapPin className="h-3.5 w-3.5 text-gold-400 flex-shrink-0" />
              <span className="truncate">{eventData.venue}</span>
            </div>
          </div>
        </div>

        {/* Perforated Divider with Cutout Notches */}
        <div className="relative flex items-center justify-between my-0 bg-navy-950">
          {/* Left Notch */}
          <div className="h-6 w-3 rounded-r-full bg-[#FFFFFF] border-r border-t border-b border-gold-500/40 -ml-px shadow-inner" />
          {/* Dashed line */}
          <div className="flex-1 border-b-2 border-dashed border-gold-500/40 mx-2" />
          {/* Right Notch */}
          <div className="h-6 w-3 rounded-l-full bg-[#FFFFFF] border-l border-t border-b border-gold-500/40 -mr-px shadow-inner" />
        </div>

        {/* Main Body: Participant Details & QR Code */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* Participant Details */}
            <div className="sm:col-span-7 space-y-3.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gold-400">
                  NAMA PESERTA
                </span>
                <p className="font-display text-lg sm:text-xl font-bold text-ivory-100">
                  {order.customerName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-ivory-200/60 block">
                    NIM
                  </span>
                  <span className="font-mono font-semibold text-ivory-100">
                    {order.nim}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-ivory-200/60 block">
                    JUMLAH
                  </span>
                  <span className="font-semibold text-ivory-100">
                    {order.quantity} Tiket
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-ivory-200/60 block">
                  FAKULTAS / PRODI
                </span>
                <p className="text-xs text-ivory-200/90 font-medium line-clamp-1">
                  {order.studyProgram}
                </p>
                <p className="text-[11px] text-ivory-200/60 line-clamp-1">
                  {order.faculty}
                </p>
              </div>

              {/* Check-In Status */}
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-ivory-200/60 block mb-1">
                  STATUS KEHADIRAN (CHECK-IN)
                </span>
                {order.checkedIn ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Sudah Check-In ({order.checkedInAt || "Verified"})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/20 px-3 py-1 text-xs font-bold text-gold-300 border border-gold-500/30">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Tiket Valid — Siap Digunakan</span>
                  </span>
                )}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl bg-navy-900 border border-gold-500/30 text-center">
              <QRCodeDisplay value={qrPayload} size={150} />
              <span className="mt-2 font-mono text-[11px] font-bold text-gold-400 tracking-wider">
                {order.orderId}
              </span>
              <p className="text-[9px] text-ivory-200/60 mt-0.5">
                Scan di meja registrasi venue
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Footer Stub */}
        <div className="border-t border-navy-800/80 bg-navy-900/60 px-6 py-4 flex items-center justify-between text-[11px] text-ivory-200/60">
          <span>Organizer: HIPMI PT Telkom University</span>
          <span className="text-gold-400 font-semibold">Verified Pass ✦</span>
        </div>
      </div>

      {/* Action Buttons (Hidden when printing) */}
      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden max-w-xl mx-auto">
        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-6 py-3.5 text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95"
        >
          <Printer className="h-4 w-4" />
          <span>Cetak / Simpan PDF</span>
        </button>

        <button
          type="button"
          onClick={handleAddToCalendar}
          className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-6 py-3.5 text-sm font-bold text-navy-900 hover:border-gold-500 hover:text-gold-600 transition-all shadow-sm active:scale-95"
        >
          <CalendarPlus className="h-4 w-4" />
          <span>Tambah ke Kalender</span>
        </button>
      </div>
    </div>
  );
}
