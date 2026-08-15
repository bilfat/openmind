"use client";

import React from "react";
import { ReferralCode } from "@/data/referrals";
import { Tag, Sparkles, Calendar, Users, ShieldCheck, Percent, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferralPreviewProps {
  formData: {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    maxDiscount?: number;
    usageLimit?: number;
    usedCount: number;
    startDate: string;
    endDate: string;
    status: string;
    description?: string;
  };
}

export function ReferralPreview({ formData }: ReferralPreviewProps) {
  const isPercentage = formData.discountType === "PERCENTAGE";
  const quota = formData.usageLimit || 100;
  const remaining = Math.max(0, quota - formData.usedCount);
  const usedPercent = Math.min(100, Math.round((formData.usedCount / quota) * 100));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-gold-500" />
          <span>Live Voucher Preview</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          Sesuai Tampilan Promo
        </span>
      </div>

      {/* Luxury Promo Voucher Card */}
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl border-2 border-gold-500/40 bg-navy-950 text-ivory-100 shadow-2xl transition-all duration-300">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Voucher Body */}
        <div className="p-6 space-y-4 border-b border-navy-800">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/15 px-3 py-1 text-[10px] font-bold text-gold-400 uppercase tracking-widest border border-gold-500/30">
              <Tag className="h-3 w-3" />
              <span>OFFICIAL PROMO VOUCHER</span>
            </span>

            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                formData.status === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              )}
            >
              {formData.status}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-ivory-200/60 uppercase font-bold tracking-wider block mb-1">
              KODE REFERAL:
            </span>
            <div className="inline-block rounded-2xl bg-navy-900 border border-gold-500/30 px-4 py-2 font-mono text-2xl font-black tracking-wider text-gold-400 shadow-inner">
              {formData.code || "KODEREFERAL"}
            </div>
          </div>

          <div className="pt-2">
            <span className="text-[10px] text-ivory-200/60 uppercase font-bold tracking-wider block">
              NILAI POTONGAN HARGA:
            </span>
            <div className="font-display text-3xl font-black text-ivory-100">
              {isPercentage ? (
                <>
                  {formData.discountValue || 0}% <span className="text-gold-400 text-xl font-bold">OFF</span>
                </>
              ) : (
                <>
                  Rp {(formData.discountValue || 0).toLocaleString("id-ID")}{" "}
                  <span className="text-gold-400 text-xl font-bold">OFF</span>
                </>
              )}
            </div>
            {isPercentage && formData.maxDiscount && formData.maxDiscount > 0 && (
              <p className="text-[11px] text-gold-400/90 mt-0.5">
                Maksimal potongan: Rp {formData.maxDiscount.toLocaleString("id-ID")}
              </p>
            )}
          </div>
        </div>

        {/* Perforated Divider with Cutout Notches */}
        <div className="relative flex items-center justify-between my-0 bg-navy-950">
          <div className="h-5 w-2.5 rounded-r-full bg-[#F5F3EE] border-r border-t border-b border-gold-500/40 -ml-px" />
          <div className="flex-1 border-b-2 border-dashed border-gold-500/30 mx-2" />
          <div className="h-5 w-2.5 rounded-l-full bg-[#F5F3EE] border-l border-t border-b border-gold-500/40 -mr-px" />
        </div>

        {/* Bottom Voucher Details */}
        <div className="p-6 space-y-4">
          <div className="space-y-2 text-xs text-ivory-200/80">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-ivory-200/60">
                <Calendar className="h-3.5 w-3.5 text-gold-400" />
                <span>Berlaku s/d:</span>
              </span>
              <strong className="font-mono text-ivory-100">
                {formData.endDate ? formData.endDate.replace("T", " ") : "17 Sep 2026"}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-ivory-200/60">
                <Users className="h-3.5 w-3.5 text-gold-400" />
                <span>Sisa Kuota:</span>
              </span>
              <strong className="text-gold-300 font-bold">
                {remaining} dari {quota} penggunaan
              </strong>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-navy-900 overflow-hidden">
              <div
                className="h-full bg-gold-500 rounded-full transition-all duration-500"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <span className="block text-right text-[10px] text-ivory-200/50">
              {formData.usedCount} terpakai ({usedPercent}%)
            </span>
          </div>

          <p className="text-[11px] text-ivory-200/60 italic leading-relaxed line-clamp-2">
            {formData.description || "Dapat dimasukkan pada kolom promo saat checkout tiket."}
          </p>
        </div>
      </div>
    </div>
  );
}
