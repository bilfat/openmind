"use client";

import React from "react";
import { TicketType } from "@/data/tickets";
import {
  Check,
  Lock,
  Globe,
  Sparkles,
  Ticket,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketPreviewProps {
  formData: {
    name: string;
    description: string;
    type: "FREE" | "PAID";
    visibility: "PUBLIC" | "PRIVATE";
    price: number;
    discountPercentage: number;
    finalPrice: number;
    quota: number;
    issued: number;
    salesStart: string;
    salesEnd: string;
    benefits: string[];
    badge?: string;
  };
}

export function TicketPreview({ formData }: TicketPreviewProps) {
  const isFree = formData.type === "FREE";
  const isPrivate = formData.visibility === "PRIVATE";
  const hasDiscount = !isFree && formData.discountPercentage > 0;
  const remaining = Math.max(0, formData.quota - formData.issued);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-gold-500" />
          <span>Live Ticket Card Preview</span>
        </span>
        <span className="text-[10px] text-muted-foreground">
          Sesuai Tampilan Guest
        </span>
      </div>

      {/* Ticket Voucher Card */}
      <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl border-2 border-gold-500/40 bg-navy-950 text-ivory-100 shadow-2xl transition-all duration-300">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="border-b border-navy-800 p-6 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block rounded-full bg-gold-500/15 px-2.5 py-0.5 text-[10px] font-bold text-gold-400 uppercase tracking-widest border border-gold-500/30">
                  {isFree ? "FREE PASS" : "TIKET BERBAYAR"}
                </span>
                {isPrivate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/40">
                    <Lock className="h-2.5 w-2.5" />
                    <span>PRIVATE</span>
                  </span>
                )}
              </div>
              <h3 className="font-display text-2xl font-black text-ivory-100">
                {formData.name || "Nama Jenis Tiket"}
              </h3>
            </div>
          </div>

          <p className="text-xs text-ivory-200/70 line-clamp-2 leading-relaxed font-light">
            {formData.description || "Deskripsi singkat mengenai jenis tiket dan hak akses peserta."}
          </p>

          {/* Pricing */}
          <div className="pt-2">
            {isFree ? (
              <div className="font-display text-3xl font-black text-gold-400">
                GRATIS <span className="text-xs font-normal text-ivory-200/60">(Rp 0)</span>
              </div>
            ) : (
              <div>
                {hasDiscount && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ivory-200/50 line-through">
                      Rp {(formData.price ?? 0).toLocaleString("id-ID")}
                    </span>
                    <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      {formData.discountPercentage}% OFF
                    </span>
                  </div>
                )}
                <div className="font-display text-3xl font-black text-gold-400">
                  Rp {(formData.finalPrice ?? 0).toLocaleString("id-ID")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Perforated Divider with Cutout Notches */}
        <div className="relative flex items-center justify-between my-0 bg-navy-950">
          <div className="h-5 w-2.5 rounded-r-full bg-[#F5F3EE] border-r border-t border-b border-gold-500/40 -ml-px" />
          <div className="flex-1 border-b-2 border-dashed border-gold-500/30 mx-2" />
          <div className="h-5 w-2.5 rounded-l-full bg-[#F5F3EE] border-l border-t border-b border-gold-500/40 -mr-px" />
        </div>

        {/* Body Benefits */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400">
              BENEFIT TIKET:
            </span>
            <ul className="space-y-2 text-xs text-ivory-200/90">
              {formData.benefits.length === 0 ? (
                <li className="text-ivory-200/40 italic">Belum ada benefit ditambahkan.</li>
              ) : (
                formData.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-gold-400 flex-shrink-0 mt-0.5 stroke-[3]" />
                    <span>{b}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Quota Indicator */}
          <div className="rounded-xl bg-navy-900/90 border border-navy-800 p-3 flex items-center justify-between text-xs">
            <span className="text-ivory-200/70">Ketersediaan:</span>
            <strong className="text-gold-300 font-semibold">
              Tersisa {remaining} dari {formData.quota} tiket
            </strong>
          </div>

          {/* Dummy Button */}
          <button
            type="button"
            disabled
            className="w-full rounded-2xl bg-gold-500 py-3 text-center text-xs font-bold text-navy-950 shadow-md opacity-90 cursor-default"
          >
            {isFree ? "AMBIL TIKET GRATIS" : "BELI TIKET SEKARANG"}
          </button>
        </div>
      </div>
    </div>
  );
}
