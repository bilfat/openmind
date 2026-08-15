"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { mockTickets } from "@/data/tickets";
import { getStoredTickets } from "@/lib/ticket-store";
import { TicketVoucherCard } from "@/components/ticket/ticket-voucher-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getStoredOrders, getOrderByOrderId } from "@/lib/order-store";
import { OrderItem } from "@/data/orders";
import { contactWhatsApp } from "@/data/social-links";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  CreditCard,
  HelpCircle,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  Ticket,
  ArrowRight,
  XCircle,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function TiketPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const orderParam = searchParams.get("order");

  const [activeTab, setActiveTab] = useState<"catalog" | "check">(() =>
    tabParam === "check" || orderParam ? "check" : "catalog"
  );

  // Check Ticket Tracker State inside Tiket page
  const [searchQuery, setSearchQuery] = useState(orderParam || "");
  const [searched, setSearched] = useState(Boolean(orderParam));
  const [matchedOrder, setMatchedOrder] = useState<OrderItem | null>(() => {
    if (!orderParam) return null;
    const query = orderParam.trim();
    return (
      getOrderByOrderId(query) ||
      getStoredOrders().find((o) => o.email.toLowerCase() === query.toLowerCase()) ||
      null
    );
  });

  const performSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;

    setSearched(true);
    let found = getOrderByOrderId(q);

    if (!found) {
      const allOrders = getStoredOrders();
      found =
        allOrders.find((o) => o.email.toLowerCase() === q.toLowerCase()) ||
        null;
    }

    setMatchedOrder(found);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  return (
    <div className="pt-24 pb-20">
      {/* Page Header */}
      <section className="bg-secondary/40 border-b border-border py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-gold-600 border border-gold-500/20">
            <span>✦ Official Ticket Box & Portal</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-navy-900">
            Tiket OPEN MIND 2026
          </h1>
          <p className="text-base sm:text-lg text-navy-900/70 max-w-2xl mx-auto leading-relaxed">
            Dapatkan tiket seminar eksklusif Anda atau lacak status pesanan dan E-Ticket digital yang sudah dibeli.
          </p>

          {/* Tab Switcher: Beli Tiket vs Cek Tiket */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex rounded-full bg-white p-1.5 border border-border shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold transition-all duration-300",
                  activeTab === "catalog"
                    ? "bg-navy-900 text-gold-400 shadow-md"
                    : "text-navy-900/70 hover:text-navy-900"
                )}
              >
                <Ticket className="h-4 w-4" />
                <span>Pesan Tiket Baru</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("check")}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-bold transition-all duration-300",
                  activeTab === "check"
                    ? "bg-navy-900 text-gold-400 shadow-md"
                    : "text-navy-900/70 hover:text-navy-900"
                )}
              >
                <Search className="h-4 w-4" />
                <span>Cek Status & E-Ticket</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TAB 1: TICKET CATALOG ================= */}
      {activeTab === "catalog" && (
        <>
          <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            {/* Quick check ticket hint banner */}
            <div className="mb-10 rounded-2xl border border-gold-500/30 bg-gold-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 text-navy-900">
                <Sparkles className="h-4 w-4 text-gold-600 flex-shrink-0" />
                <span>Sudah pernah melakukan pemesanan tiket sebelumnya?</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("check")}
                className="inline-flex items-center gap-1.5 font-bold text-navy-950 underline hover:text-gold-600 self-start sm:self-auto cursor-pointer"
              >
                <span>Lacak Status & Buka E-Ticket di sini</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Voucher Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
              {getStoredTickets()
                .filter((t) => t.visibility === "PUBLIC" && t.status === "ACTIVE")
                .map((ticket) => (
                  <TicketVoucherCard
                    key={ticket.id}
                    ticket={ticket}
                    featured={ticket.id === "early-bird"}
                  />
                ))}
            </div>
          </section>

          {/* Syarat & Ketentuan */}
          <section className="py-16 bg-secondary/30 border-y border-border">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <SectionHeading
                align="left"
                badge="Informasi Penting"
                title="Syarat & Ketentuan Tiket"
                subtitle="Harap baca ketentuan berikut sebelum melakukan checkout tiket OPEN MIND 2026."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-navy-900/80">
                <div className="rounded-2xl border border-border bg-white p-6 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-navy-900">
                    <Clock className="h-4 w-4 text-gold-500" />
                    <span>Verifikasi Pembayaran</span>
                  </div>
                  <p className="text-xs leading-relaxed text-navy-900/70 font-light">
                    Bukti pembayaran tiket berbayar akan diverifikasi oleh tim panitia dalam waktu 1x24 jam. Simpan Order ID Anda setelah checkout.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-white p-6 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-navy-900">
                    <ShieldCheck className="h-4 w-4 text-gold-500" />
                    <span>Keaslian & Validasi QR</span>
                  </div>
                  <p className="text-xs leading-relaxed text-navy-900/70 font-light">
                    Setiap QR Code E-Ticket bersifat unik dan hanya berlaku untuk 1 kali check-in pada meja registrasi di hari H acara.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-white p-6 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-navy-900">
                    <Sparkles className="h-4 w-4 text-gold-500" />
                    <span>Pengambilan Merchandise</span>
                  </div>
                  <p className="text-xs leading-relaxed text-navy-900/70 font-light">
                    Merchandise resmi (untuk pemegang Early Bird & VIP) dapat diambil langsung di booth merchandise venue dengan menunjukkan QR E-Ticket.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-white p-6 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-navy-900">
                    <HelpCircle className="h-4 w-4 text-gold-500" />
                    <span>Bantuan & Kendala</span>
                  </div>
                  <p className="text-xs leading-relaxed text-navy-900/70 font-light">
                    Jika ada kendala saat transfer atau belum menerima status tiket, silakan buka menu Kontak untuk menghubungi admin WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ================= TAB 2: CHECK TICKET TRACKER ================= */}
      {activeTab === "check" && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          {/* Tracker Form */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
                Lacak Status & Ambil E-Ticket
              </h2>
              <p className="text-xs sm:text-sm text-navy-900/70 max-w-md mx-auto">
                Masukkan kode Order ID atau Email yang Anda gunakan saat memesan tiket.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative flex items-center max-w-lg mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Contoh: OM26-00124"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-border bg-secondary/20 py-3.5 pl-12 pr-32 text-sm text-navy-900 font-semibold focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-gold-500 px-5 py-2 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-sm cursor-pointer"
              >
                Cari Tiket
              </button>
            </form>

            {/* Sample Order IDs */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
              <span>Coba lacak contoh:</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("OM26-00124");
                  performSearch("OM26-00124");
                }}
                className="font-mono font-bold text-emerald-600 underline hover:text-emerald-700 cursor-pointer"
              >
                OM26-00124 (Approved)
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("OM26-00126");
                  performSearch("OM26-00126");
                }}
                className="font-mono font-bold text-orange-600 underline hover:text-orange-700 cursor-pointer"
              >
                OM26-00126 (Pending)
              </button>
            </div>
          </div>

          {/* Tracker Results Display */}
          {searched && (
            <div className="mt-8">
              {!matchedOrder ? (
                <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-3">
                  <XCircle className="mx-auto h-10 w-10 text-destructive" />
                  <h3 className="font-display text-xl font-bold text-navy-900">
                    Order ID Tidak Ditemukan
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Tidak ditemukan data untuk &ldquo;{searchQuery}&rdquo;. Pastikan penulisan kode Order ID sudah sesuai. Jika butuh bantuan, hubungi admin WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* APPROVED RESULT */}
                  {matchedOrder.paymentStatus === "approved" && (
                    <div className="overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-white shadow-xl">
                      <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                          <div>
                            <span className="inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase text-emerald-800 tracking-wider mb-1">
                              Status: Disetujui (Approved)
                            </span>
                            <h3 className="font-display text-xl font-bold text-navy-900">
                              E-Ticket Kamu Siap Digunakan!
                            </h3>
                          </div>
                        </div>

                        <Link
                          href={`/ticket/${matchedOrder.orderId}`}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                        >
                          <Ticket className="h-4 w-4" />
                          <span>Buka E-Ticket Digital (QR Pass)</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>

                      <div className="p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground uppercase tracking-wider block font-semibold">
                            ORDER ID
                          </span>
                          <span className="font-mono text-base font-bold text-navy-900">
                            {matchedOrder.orderId}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase tracking-wider block font-semibold">
                            NAMA PESERTA
                          </span>
                          <span className="text-sm font-bold text-navy-900">
                            {matchedOrder.customerName}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase tracking-wider block font-semibold">
                            TIKET
                          </span>
                          <span className="text-sm font-bold text-gold-600">
                            {matchedOrder.ticketName} ({matchedOrder.quantity} Pax)
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase tracking-wider block font-semibold">
                            STATUS KEHADIRAN
                          </span>
                          <span className="text-sm font-bold text-navy-900">
                            {matchedOrder.checkedIn ? "Sudah Hadir" : "Belum Digunakan"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PENDING RESULT */}
                  {matchedOrder.paymentStatus === "pending" && (
                    <div className="overflow-hidden rounded-3xl border-2 border-orange-500/40 bg-white shadow-xl">
                      <div className="bg-orange-500/10 border-b border-orange-500/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md">
                            <Clock className="h-6 w-6" />
                          </div>
                          <div>
                            <span className="inline-block rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase text-orange-800 tracking-wider mb-1">
                              Status: Menunggu Verifikasi
                            </span>
                            <h3 className="font-display text-xl font-bold text-navy-900">
                              Bukti Transfer Sedang Diverifikasi
                            </h3>
                          </div>
                        </div>

                        <a
                          href={`https://wa.me/${contactWhatsApp.number}?text=Halo%20Admin%20OPEN%20MIND%202026,%20saya%20ingin%20konfirmasi%20pembayaran%20Order%20ID:%20${matchedOrder.orderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy-900 px-6 py-3.5 text-sm font-bold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-md"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>Konfirmasi via WhatsApp</span>
                        </a>
                      </div>

                      <div className="p-6 sm:p-8 space-y-4">
                        <p className="text-sm text-navy-900/80 leading-relaxed font-light">
                          Panitia sedang memproses verifikasi struk transfer Anda (maksimal 1x24 jam). E-Ticket QR Code akan otomatis aktif setelah pembayaran disetujui.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* REJECTED RESULT */}
                  {matchedOrder.paymentStatus === "rejected" && (
                    <div className="overflow-hidden rounded-3xl border-2 border-destructive/40 bg-white shadow-xl">
                      <div className="bg-destructive/10 border-b border-destructive/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive text-white shadow-md">
                            <AlertTriangle className="h-6 w-6" />
                          </div>
                          <div>
                            <span className="inline-block rounded-full bg-destructive/20 px-2.5 py-0.5 text-[11px] font-bold uppercase text-destructive tracking-wider mb-1">
                              Status: Pembayaran Ditolak
                            </span>
                            <h3 className="font-display text-xl font-bold text-navy-900">
                              Verifikasi Ditolak
                            </h3>
                          </div>
                        </div>

                        <Link
                          href={`/payment?order=${matchedOrder.orderId}`}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-6 py-3.5 text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md"
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span>Upload Ulang Bukti Transfer</span>
                        </Link>
                      </div>

                      <div className="p-6 sm:p-8 space-y-3">
                        <div className="rounded-2xl bg-destructive/10 p-4 text-xs text-destructive">
                          <strong>Alasan Penolakan:</strong>{" "}
                          {matchedOrder.rejectReason || "Foto bukti transfer tidak terbaca / tidak sesuai nominal."}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function TiketPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-32 pb-20 text-center">
          <p className="text-sm font-semibold text-gold-600 animate-pulse">
            Memuat Halaman Tiket...
          </p>
        </div>
      }
    >
      <TiketPageContent />
    </Suspense>
  );
}
