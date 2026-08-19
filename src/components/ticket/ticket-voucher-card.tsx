"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TicketType } from "@/data/tickets";
import { Check, Ticket, Sparkles, Minus, Plus, Crown, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveEvent } from "@/hooks/use-active-event";
import { eventDisplayName } from "@/lib/event-utils";

interface TicketVoucherCardProps {
  ticket: TicketType;
  featured?: boolean;
  index?: number;
}

export function TicketVoucherCard({ ticket, featured = false, index = 0 }: TicketVoucherCardProps) {
  const { event } = useActiveEvent();
  const displayName = eventDisplayName(event);
  const min = ticket.minPurchase || 1;
  const max = ticket.maxPurchase || 5;
  const [quantity, setQuantity] = useState(min);

  const isSoldOut = ticket.status === "SOLD_OUT" || ticket.issued >= ticket.quota;
  const isFree = ticket.type === "FREE";
  const remaining = Math.max(0, ticket.quota - ticket.issued);

  const handleIncrement = () => {
    if (quantity < max) setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (quantity > min) setQuantity((prev) => prev - 1);
  };

  const effectivePrice = isFree ? 0 : ticket.finalPrice;
  const totalPrice = effectivePrice * quantity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: "easeOut" }}
      className="relative h-full"
    >
      {/* Animated gold border for featured ticket */}
      <div
        className={cn(
          "relative h-full rounded-[1.75rem]",
          featured && "gold-border-animated p-[1.5px] shadow-[0_0_40px_rgba(201,162,74,0.35)]"
        )}
      >
        {/* Glass Ticket Body */}
        <div
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-[calc(1.75rem-1.5px)]",
            featured
              ? "bg-gradient-to-b from-navy-800 to-navy-950"
              : "glass-ios glass-sheen"
          )}
        >
          {/* Liquid glass reflection overlay */}
          {featured && <div className="glass-ios pointer-events-none absolute inset-0" aria-hidden />}

          {/* Corner gold ornaments */}
          <div className="pointer-events-none absolute left-3 top-3 h-1.5 w-1.5 rounded-full bg-gold-400/70" />
          <div className="pointer-events-none absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-gold-400/70" />

          {/* Top Header Badge */}
          {ticket.badge && (
            <div className="absolute right-6 top-0 z-10">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-b-2xl px-4 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-lg",
                  featured
                    ? "bg-gold-500 text-navy-950 shadow-gold-500/30"
                    : "bg-white/15 text-gold-300 backdrop-blur-md"
                )}
              >
                {featured ? <Crown className="h-3 w-3" /> : <Flame className="h-3 w-3" />}
                {ticket.badge}
              </span>
            </div>
          )}

          {/* Main Ticket Stub Area (Top) */}
          <div className={cn("relative flex flex-col p-6 sm:p-8", isSoldOut && "opacity-60")}>
            {/* Ticket series label */}
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold-400">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              <span>{displayName} · Official Pass</span>
            </div>

            {/* Title */}
            <h3
              className={cn(
                "font-display text-3xl font-black tracking-tight sm:text-4xl",
                featured
                  ? "text-gold-gradient"
                  : "text-ivory-100"
              )}
            >
              {ticket.name}
            </h3>

            {/* Description */}
            <p className="mt-2.5 text-xs leading-relaxed text-ivory-200/65 font-light line-clamp-2 sm:text-sm">
              {ticket.description}
            </p>

            {/* Pricing Display */}
            <div className="mt-6">
              {isFree ? (
                <div className="flex items-end gap-3">
                  <span className="font-display text-4xl font-black text-gold-gradient sm:text-5xl">
                    FREE
                  </span>
                  <span className="pb-1.5 text-xs font-medium text-ivory-200/50">/ Mahasiswa Tel-U</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-4xl font-black text-ivory-100 sm:text-5xl">
                      Rp {ticket.finalPrice.toLocaleString("id-ID")}
                    </span>
                    <span className="text-xs font-medium text-ivory-200/50">/ tiket</span>
                  </div>
                  {ticket.discountPercentage > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="text-ivory-200/40 line-through">
                        Rp {ticket.price.toLocaleString("id-ID")}
                      </span>
                      <span className="rounded-md bg-gold-500/20 px-2 py-0.5 text-[10px] font-black text-gold-300 ring-1 ring-gold-500/30">
                        Hemat {ticket.discountPercentage}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quota Indicator */}
            <div className="mt-4 flex items-center gap-2 text-xs">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isSoldOut
                    ? "bg-destructive"
                    : remaining < 30
                    ? "bg-amber-500 animate-pulse"
                    : "bg-emerald-400"
                )}
              />
              <span className="text-ivory-200/70">
                {isSoldOut
                  ? "Kuota Tiket Habis"
                  : remaining < 30
                  ? `Hanya tersisa ${remaining} tiket!`
                  : `Tersisa ${remaining} tiket`}
              </span>
            </div>

            {/* Benefits List */}
            <div className="mt-6 space-y-2.5 border-t border-white/10 pt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-400/80">
                Fasilitas Termasuk
              </p>
              <ul className="space-y-2 text-xs text-ivory-200/80">
                {ticket.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-400">
                      <Check className="h-2.5 w-2.5 stroke-[3.5]" />
                    </span>
                    <span className="leading-snug">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Perforated Ticket Divider */}
          <div className="relative my-1 flex items-center justify-between">
            <div className="absolute left-0 top-1/2 h-7 w-3.5 -translate-y-1/2 rounded-r-full border border-r border-t border-b border-gold-500/30 bg-navy-950" />
            <div className="absolute right-0 top-1/2 h-7 w-3.5 -translate-y-1/2 rounded-l-full border border-l border-t border-b border-gold-500/30 bg-navy-950" />
            <div className="mx-5 flex-1 border-b-2 border-dashed border-gold-500/25" />
          </div>

          {/* Bottom Action Stub */}
          <div className="relative flex flex-col gap-4 p-6 pt-4 sm:p-8 sm:pt-4">
            {/* Quantity Selector for Paid Tickets */}
            {!isFree && !isSoldOut && (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-md">
                <span className="pl-2 text-xs font-semibold text-ivory-100">Jumlah:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={quantity <= min}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-ivory-100 transition-all duration-200 hover:bg-gold-500 hover:text-navy-950 active:scale-90 disabled:opacity-30 touch-target"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <motion.span
                    key={quantity}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-4 text-center text-sm font-black text-gold-300"
                    aria-live="polite"
                  >
                    {quantity}
                  </motion.span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={quantity >= max || quantity >= remaining}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-ivory-100 transition-all duration-200 hover:bg-gold-500 hover:text-navy-950 active:scale-90 disabled:opacity-30 touch-target"
                    aria-label="Tambah jumlah"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* CTA Button */}
            {isSoldOut ? (
              <div className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-center text-xs font-black uppercase tracking-wider text-ivory-200/40">
                Sold Out
              </div>
            ) : (
              <Link
                href={`/checkout?ticket=${ticket.id}&qty=${quantity}`}
                className={cn(
                  "group/cta flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-wider transition-all duration-300 btn-scale",
                  featured
                    ? "bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 shadow-lg shadow-gold-500/30 hover:shadow-gold-500/50"
                    : "border border-gold-500/40 bg-white/5 text-ivory-100 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-950"
                )}
                aria-label={`Beli tiket ${ticket.name}`}
              >
                <Ticket className="h-4 w-4 transition-transform duration-300 group-hover/cta:rotate-12" />
                <span>
                  {isFree ? "Pesan Tiket Gratis" : `Beli Tiket — Rp ${totalPrice.toLocaleString("id-ID")}`}
                </span>
              </Link>
            )}

            {/* Hover hint for glass sheen */}
            <span className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-ivory-200/30">
              Perforated E-Ticket · Valid One Time Use
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}