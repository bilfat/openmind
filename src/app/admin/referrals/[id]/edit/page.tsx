"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ReferralCode } from "@/data/referrals";
import { getReferralById } from "@/lib/referral-store";
import { ReferralForm } from "@/components/admin/referrals/referral-form";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditReferralPage() {
  const params = useParams();
  const referralId = (params?.id as string) || "";
  const [referral, setReferral] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!referralId) {
        setLoading(false);
        return;
      }
      const r = await getReferralById(referralId);
      if (!cancelled) {
        setReferral(r);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [referralId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm font-semibold text-gold-600 animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Memuat Konfigurasi Kode Referal...</span>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="p-12 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Kode referal tidak ditemukan atau telah dihapus.
        </p>
        <Link
          href="/admin/referrals"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-navy-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Referal</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <ReferralForm initialData={referral} isEdit />
    </div>
  );
}
