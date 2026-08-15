"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TicketType } from "@/data/tickets";
import { Check, Ticket, Sparkles, Minus, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketVoucherCardProps {
  ticket: TicketType;
  featured?: boolean;
}

export function TicketVoucherCard({ ticket, featured = false }: TicketVoucherCardProps) {
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
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-3xl border ticket-lift",
        featured
          ? "border-gold-500 bg-gradient-to-b from-white to-secondary/30 shadow-xl shadow-gold-500/10 scale-[1.02]"
          : "border-border bg-white shadow-md hover:border-gold-500/60",
        isSoldOut && "opacity-75 grayscale-[0.5]"
      )}
    >
      {/* Top Header Badge */}
      {ticket.badge && (
        <div className="absolute top-0 right-8 z-10">
          <span
            className={cn(
              "inline-block rounded-b-xl px-4 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm",
              featured
                ? "bg-gold-500 text-navy-950"
                : "bg-navy-900 text-gold-400"
            )}
          >
            {ticket.badge}
          </span>
        </div>
      )}

      {/* Main Ticket Stub Area (Top) */}
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-500 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-gold-500" />
          <span>OPEN MIND 2026 PASS</span>
        </div>

        <h3 className="font-display text-2xl sm:text-3xl font-black text-navy-900 mb-2">
          {ticket.name}
        </h3>

        <p className="text-xs text-navy-900/70 mb-4 leading-relaxed line-clamp-2">
          {ticket.description}
        </p>

        {/* Pricing Display */}
        <div className="my-5">
          {isFree ? (
            <div>
              <span className="text-3xl sm:text-4xl font-black text-navy-900 font-display">
                FREE
              </span>
              <span className="text-xs text-navy-900/60 ml-2 font-medium">/ Mahasiswa Tel-U</span>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-navy-900 font-display">
                  Rp {ticket.finalPrice.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-navy-900/60 font-medium">/ tiket</span>
              </div>
              {ticket.discountPercentage > 0 && (
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-navy-900/40 line-through">
                    Rp {ticket.price.toLocaleString("id-ID")}
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    Hemat {ticket.discountPercentage}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quota Indicator */}
        <div className="mb-4 flex items-center gap-2 text-xs">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isSoldOut
                ? "bg-destructive"
                : remaining < 20
                ? "bg-amber-500 animate-pulse"
                : "bg-emerald-500"
            )}
          />
          <span className="text-navy-900/70">
            {isSoldOut
              ? "Kuota Tiket Habis"
              : remaining < 30
              ? `Hanya tersisa ${remaining} tiket!`
              : `Tersisa ${remaining} tiket`}
          </span>
        </div>

        {/* Benefits List */}
        <div className="space-y-2.5 pt-4 border-t border-border">
          <p className="text-[11px] font-bold uppercase tracking-wider text-navy-900">
            Fasilitas Termasuk:
          </p>
          <ul className="space-y-2 text-xs text-navy-900/80">
            {ticket.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-gold-500 flex-shrink-0 mt-0.5 stroke-[3]" />
                <span className="leading-snug">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Perforated Divider */}
      <div className="relative flex items-center justify-between my-2">
        <div className="h-6 w-3 rounded-r-full bg-secondary/80 border-r border-t border-b border-border -ml-px" />
        <div className="flex-1 border-b-2 border-dashed border-border mx-2" />
        <div className="h-6 w-3 rounded-l-full bg-secondary/80 border-l border-t border-b border-border -mr-px" />
      </div>

      {/* Bottom Action Stub */}
      <div className="p-6 sm:p-8 pt-4 bg-secondary/20 space-y-4">
        {/* Quantity Selector for Paid Tickets */}
        {!isFree && !isSoldOut && (
          <div className="flex items-center justify-between bg-white rounded-2xl p-2 border border-border">
            <span className="text-xs font-semibold text-navy-900 pl-2">Jumlah:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= min}
                className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-navy-900 hover:bg-gold-500 hover:text-navy-950 transition-colors disabled:opacity-30 touch-target"
                aria-label="Kurangi jumlah"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="font-bold text-sm text-navy-900 w-4 text-center" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= max || quantity >= remaining}
                className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center text-navy-900 hover:bg-gold-500 hover:text-navy-950 transition-colors disabled:opacity-30 touch-target"
                aria-label="Tambah jumlah"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {isSoldOut ? (
          <button
            disabled
            className="w-full rounded-2xl bg-secondary/80 py-4 text-xs font-bold uppercase tracking-wider text-navy-900/40 cursor-not-allowed text-center"
          >
            Sold Out
          </button>
        ) : (
          <Link
            href={`/checkout?ticket=${ticket.id}&qty=${quantity}`}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md btn-scale",
              featured
                ? "bg-gold-500 text-navy-950 hover:bg-gold-400 hover:shadow-gold-500/20"
                : "bg-navy-900 text-gold-400 hover:bg-gold-500 hover:text-navy-950"
            )}
            aria-label={`Beli tiket ${ticket.name}`}
          >
            <Ticket className="h-4 w-4" />
            <span>
              {isFree ? "Pesan Tiket Gratis" : `Beli Tiket — Rp ${totalPrice.toLocaleString("id-ID")}`}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
