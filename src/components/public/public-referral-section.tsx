"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { PublicReferralVoucher } from "./public-referral-voucher";
import { Gift, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PublicReferralCode {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "UPCOMING" | "INACTIVE";
  description?: string;
  createdAt: string;
  eventId?: string;
  isPublic?: boolean;
}

export function PublicReferralSection() {
  const [referrals, setReferrals] = useState<PublicReferralCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchReferrals() {
      try {
        const res = await fetch("/api/public/referrals");
        if (cancelled) return;
        const json = await res.json();
        if (json.success) setReferrals(json.items);
      } catch (err) {
        console.error("Error fetching public referrals:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReferrals();
    return () => { cancelled = true; };
  }, []);

  const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  } as const;

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  } as const;

  return (
    <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-64 w-64 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24A_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.04]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeading
          badge="Promo Spesial"
          title="Kode Referal Publik"
          subtitle="Gunakan kode-kode berikut saat checkout untuk mendapatkan diskon eksklusif. Kuota terbatas!"
        />
      </motion.div>

      {loading ? (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="rounded-3xl border-2 border-gold-500/20 bg-navy-950/50 p-6 h-64" />
            </div>
          ))}
        </div>
      ) : referrals.length === 0 ? (
        <div className="mt-12 text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold-500/10 mb-4">
            <Gift className="h-10 w-10 text-gold-500" />
          </div>
          <h3 className="font-display text-xl font-bold text-navy-900 mb-2">
            Belum Ada Kode Referal Publik
          </h3>
          <p className="text-navy-900/70 max-w-md mx-auto">
            Saat ini tidak ada kode referal yang ditampilkan untuk publik. Kembali nanti untuk promo terbaru!
          </p>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {referrals.map((ref, idx) => (
            <motion.div key={ref.id} variants={fadeUp}>
              <PublicReferralVoucher
                code={ref.code}
                status={ref.status}
                description={ref.description}
                index={idx}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-12 text-center"
      >
        <Link
          href="/tiket"
          className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-white px-6 py-3.5 text-sm font-bold text-gold-600 shadow-sm transition-all duration-300 hover:border-gold-500 hover:shadow-lg hover:shadow-gold-500/10"
        >
          <span>Pesan Tiket & Gunakan Kode Referal</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </section>
  );
}