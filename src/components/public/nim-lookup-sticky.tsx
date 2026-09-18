"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Ticket,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Download,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowRight,
  User,
  GraduationCap,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface NimSearchResult {
  orderId: string;
  orderCode: string;
  customerName: string;
  nim: string;
  faculty: string | null;
  studyProgram: string | null;
  ticketName: string;
  ticketCategory: string;
  orderStatus: string;
  paymentStatus: "approved" | "pending" | "rejected";
  isApproved: boolean;
  ticketCode: string | null;
  qrToken: string | null;
  ticketStatus: string | null;
  whatsappGroupUrl: string | null;
  ticketUrl: string;
  downloadPdfUrl: string;
  createdAt: string;
}

export function NimLookupSticky() {
  const [isOpen, setIsOpen] = useState(false);
  const [nimInput, setNimInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<NimSearchResult[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setErrorMsg(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setErrorMsg(null);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = nimInput.trim();
    if (!query) {
      setErrorMsg("Masukkan NIM Anda terlebih dahulu.");
      return;
    }

    if (query.length < 3) {
      setErrorMsg("NIM minimal terdiri dari 3 karakter.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setResults(null);

    try {
      const res = await fetch(`/api/public/search-nim?nim=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Data NIM tidak ditemukan.");
        return;
      }

      setResults(data.data || []);
    } catch (err: any) {
      console.error("Lookup error:", err);
      setErrorMsg("Gagal menghubungi server. Silakan coba beberapa saat lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSearch = () => {
    setResults(null);
    setNimInput("");
    setErrorMsg(null);
  };

  return (
    <>
      {/* ================= STICKY FLOATING TRIGGER BUTTON ================= */}
      {/* 
        Responsive placement:
        - Mobile (< md): bottom-[76px] right-4 (floating right above .mobile-cta-bar)
        - Desktop (>= md): bottom-6 right-6
      */}
      <div className="fixed z-40 right-4 bottom-[76px] md:bottom-6 md:right-6">
        <motion.button
          type="button"
          onClick={handleOpen}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-4 py-2.5 md:px-5 md:py-3 text-ivory-100 shadow-[0_8px_25px_rgba(0,0,0,0.6)] border border-gold-500/50 hover:border-gold-400 hover:shadow-[0_0_25px_rgba(201,162,74,0.35)] transition-all duration-300"
          aria-label="Cek ID Order dan Grup via NIM"
        >
          {/* Subtle glowing animated ring */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-gold-500/40 via-gold-400/20 to-gold-500/40 opacity-75 blur-sm group-hover:opacity-100 transition duration-300 -z-10 animate-pulse" />

          <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40">
            <Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[11px] md:text-xs font-bold tracking-wide text-ivory-100 flex items-center gap-1">
              Cek Tiket & Grup <span className="text-gold-400 font-mono">NIM</span>
            </span>
            <span className="text-[9px] md:text-[10px] text-ivory-200/60 hidden sm:inline">
              Cari ID Order & Masuk Grup
            </span>
          </div>
        </motion.button>
      </div>

      {/* ================= MODAL DIALOG ================= */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-navy-950/85 backdrop-blur-md"
              onClick={handleClose}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gold-500/30 bg-navy-900/95 shadow-2xl text-ivory-100 my-auto max-h-[90vh] flex flex-col"
            >
              {/* Ambient Background Glows */}
              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-navy-700/30 blur-3xl" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-500/20 text-gold-400 ring-1 ring-gold-500/40">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-ivory-100">
                      Cek Tiket & Grup via NIM
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-gold-400/80 font-mono">
                      Pencarian Cepat Peserta Mahasiswa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl p-2 text-ivory-200/50 hover:bg-white/10 hover:text-ivory-100 transition-colors"
                  aria-label="Tutup modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                {/* Search Form (Always visible or compact when results exist) */}
                <form onSubmit={handleSearch} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-ivory-100">
                      Nomor Induk Mahasiswa (NIM)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-400/70" />
                      <input
                        type="text"
                        value={nimInput}
                        onChange={(e) => setNimInput(e.target.value)}
                        placeholder="Contoh: 6706220014"
                        className="w-full rounded-2xl border border-gold-500/30 bg-navy-950/90 py-3.5 pl-10 pr-4 font-mono text-sm text-ivory-100 placeholder:text-ivory-200/30 focus:border-gold-500 focus:bg-navy-950 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all"
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-navy-950 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/35 transition-all duration-300 disabled:opacity-50 active:scale-98"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-navy-950 border-t-transparent animate-spin" />
                        <span>Mencari Data NIM...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        <span>Cari Data Tiket & Grup</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Error Banner */}
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-xs text-rose-300"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                    <p className="leading-relaxed">{errorMsg}</p>
                  </motion.div>
                )}

                {/* Initial Guide when no results yet */}
                {!results && !errorMsg && !isLoading && (
                  <div className="rounded-2xl border border-gold-500/15 bg-white/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-gold-400 text-xs font-bold">
                      <Sparkles className="h-4 w-4" />
                      <span>Manfaat Fitur Ini</span>
                    </div>
                    <ul className="text-[11px] text-ivory-200/70 space-y-1.5 list-disc list-inside">
                      <li>Menemukan <b>ID Order</b> jika kamu lupa atau kehilangan email konfirmasi.</li>
                      <li>Langsung mendapatkan link resmi <b>Grup WhatsApp Peserta</b>.</li>
                      <li>Membuka & mengunduh <b>E-Tiket Digital (QR Pass & PDF)</b>.</li>
                    </ul>
                  </div>
                )}

                {/* Search Results Display */}
                {results && results.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4 pt-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Ditemukan ({results.length} Tiket)
                      </span>
                      <button
                        type="button"
                        onClick={handleResetSearch}
                        className="text-[11px] text-gold-400 hover:underline"
                      >
                        Cari NIM lain
                      </button>
                    </div>

                    {results.map((item, idx) => (
                      <div
                        key={`${item.orderCode}-${idx}`}
                        className="rounded-2xl border border-gold-500/25 bg-navy-950/80 p-4 space-y-3.5 shadow-xl"
                      >
                        {/* Participant & Ticket Type Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-ivory-100 flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-gold-400" />
                              {item.customerName}
                            </h4>
                            <p className="text-[11px] text-ivory-200/60 font-mono mt-0.5">
                              NIM: {item.nim} {item.faculty ? `• ${item.faculty}` : ""}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              item.isApproved
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : item.paymentStatus === "rejected"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {item.isApproved
                              ? "Tiket Aktif"
                              : item.paymentStatus === "rejected"
                              ? "Dibatalkan"
                              : "Menunggu"}
                          </span>
                        </div>

                        {/* Order ID Box with Copy Button */}
                        <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/10">
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-ivory-200/50">
                              Kode Order / ID Pemesanan
                            </span>
                            <span className="font-mono text-sm sm:text-base font-black text-gold-300">
                              {item.orderCode}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.orderCode)}
                            className="flex items-center gap-1.5 rounded-lg bg-gold-500/20 px-3 py-1.5 text-xs font-bold text-gold-300 border border-gold-500/40 hover:bg-gold-500 hover:text-navy-950 transition-all active:scale-95"
                          >
                            {copiedCode === item.orderCode ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Salin ID</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Ticket Name & Category */}
                        <div className="flex items-center justify-between text-xs text-ivory-200/80 px-1">
                          <span>Kategori Tiket:</span>
                          <span className="font-bold text-gold-400">{item.ticketName}</span>
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="space-y-2 pt-1">
                          {/* WhatsApp Group Button */}
                          {item.whatsappGroupUrl ? (
                            <a
                              href={item.whatsappGroupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition-all active:scale-98"
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>Gabung Grup WhatsApp Peserta</span>
                              <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-70" />
                            </a>
                          ) : (
                            <div className="rounded-xl bg-white/5 p-2.5 text-center text-[11px] text-ivory-200/50 border border-white/5">
                              Link grup WhatsApp belum diatur oleh admin.
                            </div>
                          )}

                          {/* Digital E-Ticket Link & PDF Download (If Approved) */}
                          {item.isApproved ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Link
                                href={item.ticketUrl}
                                onClick={handleClose}
                                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 py-2.5 px-3 text-xs font-bold text-navy-950 shadow-md shadow-gold-500/20 transition-all active:scale-98"
                              >
                                <Ticket className="h-3.5 w-3.5" />
                                <span>Buka E-Ticket Digital</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>

                              <a
                                href={item.downloadPdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 rounded-xl border border-gold-500/40 bg-white/5 hover:bg-gold-500/10 py-2.5 px-3 text-xs font-bold text-gold-300 transition-all active:scale-98"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>Download PDF</span>
                              </a>
                            </div>
                          ) : (
                            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-300 flex items-center gap-2">
                              <Clock className="h-4 w-4 shrink-0" />
                              <span>E-Ticket akan aktif otomatis setelah pembayaran diverifikasi oleh admin.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
