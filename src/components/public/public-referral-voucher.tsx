"use client";

import React from "react";
import { motion } from "framer-motion";
import { Tag, Sparkles, ShieldCheck, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicReferralVoucherProps {
  code: string;
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "UPCOMING" | "INACTIVE";
  description?: string;
  index?: number;
}

export function PublicReferralVoucher({ code, status, description, index = 0 }: PublicReferralVoucherProps) {
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
          "relative h-full rounded-3xl overflow-hidden border-2",
          isExhausted ? "border-destructive/50 bg-gradient-to-b from-destructive/10 to-destructive/5" : "border-gold-500/40 bg-navy-950"
        )}
      >
        {/* Ambient Glow for active */}
        {isUsable && (
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />
        )}

        {/* Top Voucher Body */}
        <div className="p-6 space-y-4 border-b border-navy-800">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-[10px] font-bold text-gold-400 uppercase tracking-widest border border-gold-500/30">
              <Tag className="h-3 w-3" />
              <span>KODE REFERAL PUBLIK</span>
            </span>

            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
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
            <span className="text-[10px] text-ivory-200/60 uppercase font-bold tracking-wider block mb-1">
              KODE REFERAL:
            </span>
            <div className="inline-block rounded-2xl bg-navy-900 border border-gold-500/30 px-4 py-3 font-mono text-3xl font-black tracking-wider text-gold-400 shadow-inner select-all">
              {code}
            </div>
          </div>

          {description && (
            <p className="text-[11px] text-ivory-200/70 italic leading-relaxed line-clamp-2 pt-2 border-t border-navy-800">
              {description}
            </p>
          )}
        </div>

        {/* Perforated Divider with Cutout Notches */}
        <div className="relative flex items-center justify-between my-0 bg-navy-950">
          <div className="h-5 w-2.5 rounded-r-full bg-[#F5F3EE] border-r border-t border-b border-gold-500/40 -ml-px" />
          <div className="flex-1 border-b-2 border-dashed border-gold-500/30 mx-2" />
          <div className="h-5 w-2.5 rounded-l-full bg-[#F5F3EE] border-l border-t border-b border-gold-500/40 -mr-px" />
        </div>

        {/* Bottom Voucher Details */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-ivory-200/60">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              <span>Masukkan kode ini saat checkout untuk mendapatkan diskon</span>
            </span>

            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(code)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 border border-gold-500/30 px-3 py-2 text-xs font-bold text-gold-400 hover:bg-navy-800 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Salin</span>
            </button>
          </div>

          {isExhausted && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-3 py-1.5 text-xs font-bold text-destructive border border-destructive/30">
              <ShieldCheck className="h-3 w-3" />
              <span>Kode ini sudah habis (SOLD OUT)</span>
            </div>
          )}

          {isExpired && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/20 px-3 py-1.5 text-xs font-bold text-gray-400 border border-gray-500/30">
              <ShieldCheck className="h-3 w-3" />
              <span>Masa berlaku kode telah berakhir</span>
            </div>
          )}

          {isUpcoming && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 border border-amber-500/30">
              <ShieldCheck className="h-3 w-3" />
              <span>Kode belum aktif, silakan tunggu</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}