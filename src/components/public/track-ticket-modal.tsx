"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Ticket, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

interface TrackTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrackTicketModal({ isOpen, onClose }: TrackTicketModalProps) {
  const router = useRouter();
  const [orderCode, setOrderCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOrderCode("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = orderCode.trim();
    if (!trimmed) {
      setErrorMsg("Masukkan Kode Order Anda terlebih dahulu.");
      return;
    }

    router.push(`/ticket/${encodeURIComponent(trimmed)}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-navy-950/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gold-500/30 bg-navy-900 shadow-2xl text-ivory-100"
          >
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gold-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-gold-500/10 blur-3xl" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/20 text-gold-400 ring-1 ring-gold-500/40">
                  <Search className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ivory-100">Lacak Status & E-Ticket</h3>
                  <p className="text-[10px] text-gold-400/80 font-mono uppercase tracking-wider">Public Ticket Lookup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-ivory-200/50 hover:bg-white/10 hover:text-ivory-100 transition-colors"
                aria-label="Tutup modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-ivory-100">
                  Kode Order / ID Pemesanan
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-400/60" />
                  <input
                    type="text"
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value)}
                    placeholder="Contoh: OM26-00124"
                    className="w-full rounded-2xl border border-gold-500/30 bg-navy-950/80 py-3.5 pl-10 pr-4 font-mono text-xs text-ivory-100 uppercase placeholder:text-ivory-200/40 focus:border-gold-500 focus:bg-navy-950 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                    autoFocus
                  />
                </div>
              </div>

              {/* Helpful Hint */}
              <div className="rounded-2xl border border-gold-500/15 bg-white/5 p-3.5 flex items-start gap-2.5 text-xs text-ivory-200/70">
                <Sparkles className="h-4 w-4 text-gold-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  Kode Order dapat ditemukan pada pesan WhatsApp / konfirmasi email setelah melakukan checkout tiket.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 py-3.5 text-xs font-black uppercase tracking-wider text-navy-950 shadow-lg shadow-gold-500/25 transition-all duration-300 hover:shadow-gold-500/40 active:scale-98"
                >
                  <Ticket className="h-4 w-4" />
                  <span>Lacak Tiket Saya</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
