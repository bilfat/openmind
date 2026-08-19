"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TicketVoucherCard } from "@/components/ticket/ticket-voucher-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { contactWhatsApp } from "@/data/social-links";
import { useActiveEvent } from "@/hooks/use-active-event";
import { eventDisplayName } from "@/lib/event-utils";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
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
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const termItems = [
  {
    icon: Clock,
    title: "Verifikasi Pembayaran",
    desc: "Bukti pembayaran tiket berbayar akan diverifikasi oleh tim panitia dalam waktu 1x24 jam. Simpan Order ID Anda setelah checkout.",
  },
  {
    icon: ShieldCheck,
    title: "Keaslian & Validasi QR",
    desc: "Setiap QR Code E-Ticket bersifat unik dan hanya berlaku untuk 1 kali check-in pada meja registrasi di hari H acara.",
  },
  {
    icon: Zap,
    title: "Terbuka untuk Semua",
    desc: "Pembelian tiket tidak hanya untuk mahasiswa Telkom University, melainkan juga mahasiswa luar dan masyarakat umum.",
  },
  {
    icon: HelpCircle,
    title: "Bantuan & Kendala",
    desc: "Jika ada kendala saat transfer atau belum menerima status tiket, silakan buka menu Kontak untuk menghubungi admin WhatsApp.",
  },
];

const particles = [
  { top: "12%", left: "6%", delay: 0 },
  { top: "20%", right: "8%", delay: 1.4 },
  { top: "65%", left: "4%", delay: 0.7 },
  { top: "75%", right: "6%", delay: 2.1 },
  { top: "40%", left: "50%", delay: 0.4 },
  { top: "10%", right: "30%", delay: 1.8 },
];

function GlassParticles() {
  return (
    <>
      {particles.map((pos, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-gold-300"
          style={pos as React.CSSProperties}
          animate={{ y: [0, -12, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: pos.delay }}
        />
      ))}
    </>
  );
}

function TiketPageContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const orderParam = searchParams.get("order");
  const { event } = useActiveEvent();

  const displayName = eventDisplayName(event);
  const waNumber = event?.contact_whatsapp || contactWhatsApp.number;

  const [activeTab, setActiveTab] = useState<"catalog" | "check">(() =>
    tabParam === "check" || orderParam ? "check" : "catalog"
  );

  // Check Ticket Tracker State inside Tiket page
  const [searchQuery, setSearchQuery] = useState(orderParam || "");
  const [searched, setSearched] = useState(Boolean(orderParam));
  const [matchedOrder, setMatchedOrder] = useState<any | null>(null);

  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      try {
        const res = await fetch("/api/tickets/public");
        const json = await res.json();
        if (json.success) {
          setTickets(json.data);
        }
      } catch (err) {
        console.error("Error fetching tickets:", err);
      } finally {
        setLoadingTickets(false);
      }
    }
    fetchTickets();
  }, []);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const performSearch = async (query: string) => {
    const q = query.trim();
    if (!q) return;

    // Abort previous request
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    setAbortController(controller);

    setSearched(true);
    setSearchLoading(true);
    setSearchError(null);
    setMatchedOrder(null);

    try {
      const res = await fetch(`/api/tickets/public?order_code=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (res.status === 400) {
        setSearchError(data.message || "Format Order ID tidak valid.");
        return;
      }
      if (res.status === 408) {
        setSearchError("Permintaan terlalu lama. Coba lagi.");
        return;
      }
      if (res.status === 500) {
        setSearchError(data.message || "Terjadi gangguan pada server. Coba lagi.");
        return;
      }
      if (res.status === 404) {
        // Only true 404 shows "not found"
        setSearchError(data.message || "Pesanan tidak ditemukan.");
        return;
      }
      if (res.ok && data.success && data.data) {
        setMatchedOrder(data.data);
      } else {
        setSearchError(data.message || "Pesanan atau tiket tidak ditemukan.");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Search aborted");
        return;
      }
      setSearchError(err.message || "Gagal memuat status tiket.");
    } finally {
      if (controller.signal.aborted) return;
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  return (
    <div className="pt-24 pb-20 bg-navy-950">
      {/* ================= PAGE HEADER (Dark Cinematic) ================= */}
      <section className="relative overflow-hidden border-b border-gold-500/15 bg-navy-950 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950" />
        <div className="absolute left-1/2 top-0 h-72 w-[600px] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-burgundy-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-10" />
        <GlassParticles />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-400 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
            <span>Official Ticket Box & Portal</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 font-display text-4xl font-black tracking-tight text-gold-gradient sm:text-5xl lg:text-6xl"
          >
            Tiket {displayName}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-4 max-w-2xl text-base font-light leading-relaxed text-ivory-200/70 sm:text-lg"
          >
            Dapatkan tiket seminar eksklusif Anda atau lacak status pesanan dan E-Ticket digital yang sudah dibeli.
          </motion.p>

          {/* Glass Tab Switcher */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex items-center justify-center"
          >
            <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-white/15 bg-white/10 p-1.5 shadow-2xl backdrop-blur-2xl">
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-colors duration-300 sm:px-5 sm:text-sm",
                  activeTab === "catalog" ? "text-navy-950" : "text-ivory-200/80 hover:text-ivory-100"
                )}
              >
                {activeTab === "catalog" && (
                  <motion.span
                    layoutId="ticket-tab-pill"
                    className="absolute inset-0 rounded-full bg-gold-500 shadow-lg shadow-gold-500/40"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Ticket className="relative z-10 h-4 w-4" />
                <span className="relative z-10 whitespace-nowrap">Pesan Tiket Baru</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("check")}
                className={cn(
                  "relative flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-colors duration-300 sm:px-5 sm:text-sm",
                  activeTab === "check" ? "text-navy-950" : "text-ivory-200/80 hover:text-ivory-100"
                )}
              >
                {activeTab === "check" && (
                  <motion.span
                    layoutId="ticket-tab-pill"
                    className="absolute inset-0 rounded-full bg-gold-500 shadow-lg shadow-gold-500/40"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Search className="relative z-10 h-4 w-4" />
                <span className="relative z-10 whitespace-nowrap">Cek Status & E-Ticket</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= TAB 1: TICKET CATALOG ================= */}
      <AnimatePresence mode="wait">
        {activeTab === "catalog" ? (
          <motion.div
            key="catalog"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 px-4 py-16 sm:px-6 lg:px-8">
              {/* Stage glows */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(201,162,74,0.08),transparent_50%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_90%,rgba(104,31,43,0.08),transparent_50%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.06]" />
              <GlassParticles />

              <div className="relative mx-auto max-w-7xl">
                {/* Quick check ticket hint banner */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="glass-ios glass-sheen mb-10 flex flex-col items-center justify-between gap-3 rounded-2xl p-4 text-xs sm:flex-row sm:p-5 sm:text-sm"
                >
                  <div className="relative flex items-center gap-2.5 text-ivory-100">
                    <Sparkles className="h-4 w-4 shrink-0 text-gold-400" />
                    <span>Sudah pernah melakukan pemesanan tiket sebelumnya?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("check")}
                    className="relative inline-flex items-center gap-1.5 font-bold text-gold-300 underline-offset-4 transition-colors hover:text-gold-400"
                  >
                    <span>Lacak Status & Buka E-Ticket di sini</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </motion.div>

                {/* Voucher Cards Grid */}
                <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {loadingTickets ? (
                    <div className="col-span-full py-12 text-center font-light text-ivory-200/70">
                      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-gold-500" />
                      <span>Memuat daftar tiket...</span>
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-gold-500/25 bg-white/5 p-10 text-center text-ivory-200/60">
                      <span>Tidak ada tiket aktif yang tersedia untuk dibeli saat ini.</span>
                    </div>
                  ) : (
                    tickets.map((t, idx) => (
                      <TicketVoucherCard
                        key={t.id}
                        index={idx}
                        ticket={{
                          id: t.id,
                          name: t.name,
                          description: t.description || "",
                          type: t.ticket_type,
                          visibility: t.visibility,
                          price: Number(t.base_price),
                          discountPercentage: Number(t.discount_percentage),
                          finalPrice: Number(t.final_price),
                          quota: Number(t.quota),
                          issued: Number(t.quota) - Number(t.remaining_quota),
                          minPurchase: Number(t.min_purchase),
                          maxPurchase: Number(t.max_purchase),
                          salesStart: t.sales_start_at,
                          salesEnd: t.sales_end_at,
                          status: t.status,
                          benefits: t.benefits || [],
                          badge: t.code === "EARLY" ? "Best Seller" : t.base_price === 0 ? "Limited Quota" : "Standard",
                        }}
                        featured={t.code === "EARLY"}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* ================= SYARAT & KETENTUAN ================= */}
            <section className="relative overflow-hidden border-t border-gold-500/15 bg-navy-950 px-4 py-16 sm:px-6 lg:px-8">
              <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.04]" />

              <div className="relative mx-auto max-w-5xl space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.6 }}
                >
                  <SectionHeading
                    align="left"
                    dark
                    badge="Informasi Penting"
                    title="Syarat & Ketentuan Tiket"
                    subtitle={`Harap baca ketentuan berikut sebelum melakukan checkout tiket ${displayName}.`}
                  />
                </motion.div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {termItems.map((term, idx) => (
                    <motion.div
                      key={term.title}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.5, delay: idx * 0.08 }}
                      className="glass-ios glass-sheen group rounded-2xl p-6"
                    >
                      <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400 ring-1 ring-gold-500/25 transition-all duration-300 group-hover:bg-gold-500 group-hover:text-navy-950">
                        <term.icon className="h-5 w-5" />
                      </div>
                      <h3 className="relative font-display text-lg font-bold text-ivory-100">
                        {term.title}
                      </h3>
                      <p className="relative mt-1 text-xs leading-relaxed text-ivory-200/70">
                        {term.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          /* ================= TAB 2: CHECK TICKET TRACKER ================= */
          <motion.section
            key="check"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 px-4 py-16 sm:px-6 lg:px-8"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,162,74,0.08),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.05]" />
            <GlassParticles />

            <div className="relative mx-auto max-w-4xl">
              {/* Tracker Form */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55 }}
                className="glass-ios rounded-3xl p-6 sm:p-10"
              >
                <div className="relative text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gold-400">
                    <Search className="h-3 w-3" />
                    <span>Ticket Tracker</span>
                  </span>
                  <h2 className="mt-3 font-display text-2xl font-bold text-ivory-100 sm:text-3xl">
                    Lacak Status & Ambil E-Ticket
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-xs text-ivory-200/70 sm:text-sm">
                    Masukkan kode Order ID atau Email yang Anda gunakan saat memesan tiket.
                  </p>
                </div>

                <form onSubmit={handleSearchSubmit} className="relative mx-auto mt-8 flex max-w-lg items-center">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold-400" />
                  <input
                    type="text"
                    placeholder="Contoh: OM26-00124"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-white/15 bg-white/10 py-3.5 pl-12 pr-32 text-sm font-semibold text-ivory-100 backdrop-blur-md transition-all duration-300 placeholder:text-ivory-200/40 focus:border-gold-500 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                  />
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 px-5 py-2 text-xs font-black text-navy-950 shadow-lg shadow-gold-500/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                  >
                    {searchLoading ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-navy-950/30 border-t-navy-950" />
                        <span>Mencari...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        <span>Cari Tiket</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>

              {/* Tracker Results Display */}
              <AnimatePresence mode="wait">
                {searched && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="mt-8"
                  >
                    {!matchedOrder && searchError && (
                      <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-8 text-center backdrop-blur-xl">
                        <XCircle className="mx-auto h-10 w-10 text-red-400" />
                        <h3 className="mt-3 font-display text-xl font-bold text-ivory-100">
                          Order ID Tidak Ditemukan
                        </h3>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-ivory-200/70">
                          {searchError} Pastikan penulisan kode Order ID sudah sesuai. Jika butuh bantuan, hubungi admin WhatsApp.
                        </p>
                      </div>
                    )}

                    {matchedOrder && (
                      <div className="space-y-6">
                        {/* APPROVED RESULT */}
                        {matchedOrder.paymentStatus === "approved" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="overflow-hidden rounded-3xl border border-emerald-400/30 bg-emerald-500/[0.08] shadow-2xl backdrop-blur-2xl"
                          >
                            <div className="flex flex-col items-center justify-between gap-4 border-b border-emerald-400/20 bg-emerald-500/10 p-6 sm:flex-row">
                              <div className="flex items-center gap-3">
                                <motion.div
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
                                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                                >
                                  <CheckCircle2 className="h-6 w-6" />
                                </motion.div>
                                <div>
                                  <span className="mb-1 inline-block rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
                                    Status: Disetujui (Approved)
                                  </span>
                                  <h3 className="font-display text-xl font-bold text-ivory-100">
                                    E-Ticket Kamu Siap Digunakan!
                                  </h3>
                                </div>
                              </div>

                              <Link
                                href={`/ticket/${matchedOrder.qrToken || matchedOrder.orderId}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:bg-emerald-400 active:scale-95"
                              >
                                <Ticket className="h-4 w-4" />
                                <span>Buka E-Ticket Digital (QR Pass)</span>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-6 text-xs sm:grid-cols-4 sm:p-8">
                              <div>
                                <span className="block font-bold uppercase tracking-wider text-ivory-200/50">
                                  ORDER ID
                                </span>
                                <span className="font-mono text-base font-black text-gold-300">
                                  {matchedOrder.orderId}
                                </span>
                              </div>
                              <div>
                                <span className="block font-bold uppercase tracking-wider text-ivory-200/50">
                                  NAMA PESERTA
                                </span>
                                <span className="text-sm font-bold text-ivory-100">
                                  {matchedOrder.customerName}
                                </span>
                              </div>
                              <div>
                                <span className="block font-bold uppercase tracking-wider text-ivory-200/50">
                                  TIKET
                                </span>
                                <span className="text-sm font-bold text-gold-400">
                                  {matchedOrder.ticketName} ({matchedOrder.quantity} Pax)
                                </span>
                              </div>
                              <div>
                                <span className="block font-bold uppercase tracking-wider text-ivory-200/50">
                                  STATUS KEHADIRAN
                                </span>
                                <span className="text-sm font-bold text-ivory-100">
                                  {matchedOrder.checkedIn ? "Sudah Hadir" : "Belum Digunakan"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* PENDING RESULT */}
                        {matchedOrder.paymentStatus === "pending" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="overflow-hidden rounded-3xl border border-orange-400/30 bg-orange-500/[0.08] shadow-2xl backdrop-blur-2xl"
                          >
                            <div className="flex flex-col items-center justify-between gap-4 border-b border-orange-400/20 bg-orange-500/10 p-6 sm:flex-row">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                                  <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                  <span className="mb-1 inline-block rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-orange-300">
                                    Status: Menunggu Verifikasi
                                  </span>
                                  <h3 className="font-display text-xl font-bold text-ivory-100">
                                    Bukti Transfer Sedang Diverifikasi
                                  </h3>
                                </div>
                              </div>

                              <a
                                href={`https://wa.me/${waNumber}?text=Halo%20Admin%20${encodeURIComponent(displayName.replace(/ /g, "%20"))},%20saya%20ingin%20konfirmasi%20pembayaran%20Order%20ID:%20${matchedOrder.orderId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gold-500/40 bg-white/5 px-6 py-3.5 text-sm font-bold text-ivory-100 backdrop-blur-md transition-all hover:bg-gold-500 hover:text-navy-950"
                              >
                                <MessageCircle className="h-4 w-4" />
                                <span>Konfirmasi via WhatsApp</span>
                              </a>
                            </div>

                            <div className="p-6 sm:p-8">
                              <p className="text-sm font-light leading-relaxed text-ivory-200/75">
                                Panitia sedang memproses verifikasi struk transfer Anda (maksimal 1x24 jam). E-Ticket QR Code akan otomatis aktif setelah pembayaran disetujui.
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {/* REJECTED RESULT */}
                        {matchedOrder.paymentStatus === "rejected" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="overflow-hidden rounded-3xl border border-red-400/30 bg-red-500/[0.08] shadow-2xl backdrop-blur-2xl"
                          >
                            <div className="flex flex-col items-center justify-between gap-4 border-b border-red-400/20 bg-red-500/10 p-6 sm:flex-row">
                              <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/30">
                                  <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                  <span className="mb-1 inline-block rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-red-300">
                                    Status: Pembayaran Ditolak
                                  </span>
                                  <h3 className="font-display text-xl font-bold text-ivory-100">
                                    Verifikasi Ditolak
                                  </h3>
                                </div>
                              </div>

                              <Link
                                href={`/payment?order=${matchedOrder.orderId}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 px-6 py-3.5 text-sm font-black text-navy-950 shadow-lg shadow-gold-500/30 transition-all hover:brightness-110 active:scale-95"
                              >
                                <RotateCcw className="h-4 w-4" />
                                <span>Upload Ulang Bukti Transfer</span>
                              </Link>
                            </div>

                            <div className="p-6 sm:p-8">
                              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-200">
                                <strong className="text-red-100">Alasan Penolakan:</strong>{" "}
                                {matchedOrder.rejectReason || "Foto bukti transfer tidak terbaca / tidak sesuai nominal."}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TiketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center bg-navy-950 pt-24 text-center">
          <div>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-gold-500" />
            <p className="mt-4 text-sm font-semibold text-gold-400 animate-pulse">
              Memuat Halaman Tiket...
            </p>
          </div>
        </div>
      }
    >
      <TiketPageContent />
    </Suspense>
  );
}