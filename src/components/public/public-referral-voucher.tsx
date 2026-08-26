"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Sparkles, ShieldCheck, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicReferralVoucherProps {
  code: string;
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "UPCOMING" | "INACTIVE";
  description?: string;
  index?: number;
}

export function PublicReferralVoucher({ code, status, description, index = 0 }: PublicReferralVoucherProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);
  const isExhausted = status === "EXHAUSTED";
  const isExpired = status === "EXPIRED";
  const isUpcoming = status === "UPCOMING";
  const isInactive = status === "INACTIVE";
  const isUsable = status === "ACTIVE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: "easeOut" }}
      className="relative h-full"
    >
      <div
        className={cn(
          "relative h-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 flex flex-col justify-between",
          isExhausted ? "border-destructive/50 bg-gradient-to-b from-destructive/10 to-destructive/5" : "border-gold-500/40 bg-navy-950"
        )}
      >
        {/* Ambient Glow for active */}
        {isUsable && (
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />
        )}

        {/* Top Voucher Body */}
        <div className="p-3 sm:p-6 space-y-2.5 sm:space-y-4 border-b border-navy-800 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[8px] sm:px-3 sm:py-1 sm:text-[10px] font-bold text-gold-400 uppercase tracking-wider border border-gold-500/30">
              <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
              <span>REFERAL</span>
            </span>

            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[8px] sm:px-2.5 sm:text-[10px] font-bold uppercase shrink-0",
                isUsable && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                isExhausted && "bg-destructive/20 text-destructive border border-destructive/30",
                isExpired && "bg-gray-500/20 text-gray-400 border border-gray-500/30",
                isUpcoming && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                isInactive && "bg-gray-400/20 text-gray-500 border border-gray-400/30"
              )}
            >
              {isExhausted ? "SOLD OUT" : isExpired ? "KADALUARSA" : isUpcoming ? "SEGERA" : isInactive ? "NONAKTIF" : "TERSEDIA"}
            </span>
          </div>

          <div>
            <span className="text-[8px] sm:text-[10px] text-ivory-200/60 uppercase font-bold tracking-wider block mb-1">
              KODE REFERAL:
            </span>
            <div className="w-full rounded-xl sm:rounded-2xl bg-navy-900 border border-gold-500/30 px-2 py-2 sm:px-4 sm:py-3 font-mono text-center text-[10px] min-[360px]:text-xs min-[480px]:text-sm sm:text-xl md:text-2xl lg:text-3xl font-black tracking-tight sm:tracking-wider text-gold-400 shadow-inner select-all break-all leading-tight">
              {code}
            </div>
          </div>

          {description && (
            <p className="text-[9px] sm:text-[11px] text-ivory-200/70 italic leading-tight line-clamp-2 pt-1.5 sm:pt-2 border-t border-navy-800">
              {description}
            </p>
          )}
        </div>

        {/* Perforated Divider with Cutout Notches */}
        <div className="relative flex items-center justify-between my-0 bg-navy-950">
          <div className="h-3.5 w-2 sm:h-5 sm:w-2.5 rounded-r-full bg-[#F5F3EE] border-r border-t border-b border-gold-500/40 -ml-px" />
          <div className="flex-1 border-b-2 border-dashed border-gold-500/30 mx-1.5 sm:mx-2" />
          <div className="h-3.5 w-2 sm:h-5 sm:w-2.5 rounded-l-full bg-[#F5F3EE] border-l border-t border-b border-gold-500/40 -mr-px" />
        </div>

        {/* Bottom Voucher Details */}
        <div className="p-3 sm:p-6 space-y-2 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2">
            <span className="flex items-center gap-1 text-[9px] sm:text-xs text-ivory-200/60 leading-tight">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gold-400 shrink-0" />
              <span>Gunakan saat checkout</span>
            </span>

            <motion.button
              type="button"
              onClick={handleCopy}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-lg sm:rounded-xl border px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs font-bold transition-all duration-300 shrink-0",
                copied
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                  : "bg-navy-900 border-gold-500/30 text-gold-400 hover:bg-navy-800"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center justify-center gap-1"
                  >
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Tersalin!</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0, rotate: 90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                    className="inline-flex items-center justify-center gap-1"
                  >
                    <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Salin</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          {isExhausted && (
            <div className="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-1 sm:px-3 sm:py-1.5 text-[8px] sm:text-xs font-bold text-destructive border border-destructive/30">
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
              <span>Kode habis (SOLD OUT)</span>
            </div>
          )}

          {isExpired && (
            <div className="inline-flex items-center gap-1 rounded-full bg-gray-500/20 px-2 py-1 sm:px-3 sm:py-1.5 text-[8px] sm:text-xs font-bold text-gray-400 border border-gray-500/30">
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
              <span>Masa berlaku berakhir</span>
            </div>
          )}

          {isUpcoming && (
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-1 sm:px-3 sm:py-1.5 text-[8px] sm:text-xs font-bold text-amber-400 border border-amber-500/30">
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
              <span>Belum aktif</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}