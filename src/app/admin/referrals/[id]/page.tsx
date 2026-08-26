"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ReferralCode } from "@/data/referrals";
import {
  getReferralById,
  getDerivedReferralStatus,
  setReferralStatus,
  archiveReferral,
} from "@/lib/referral-store";
import { ReferralPreview } from "@/components/admin/referrals/referral-preview";
import {
  ArrowLeft,
  Edit2,
  Copy,
  Check,
  PauseCircle,
  PlayCircle,
  Archive,
  Calendar,
  Sparkles,
  Loader2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ReferralDetailPage() {
  const params = useParams();
  const referralId = (params?.id as string) || "";

  const [referral, setReferral] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!referralId) {
      setLoading(false);
      return;
    }
    const found = await getReferralById(referralId);
    setReferral(found);
    setLoading(false);
  }, [referralId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!referralId) {
        setLoading(false);
        return;
      }
      const found = await getReferralById(referralId);
      if (!cancelled) {
        setReferral(found);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [referralId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Memuat detail kode referal...</span>
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

  const derivedStatus = getDerivedReferralStatus(referral);
  const isPercentage = referral.discountType === "PERCENTAGE";
  const quota = referral.usageLimit || 100;
  const remaining = Math.max(0, quota - referral.usedCount);
  const usedPercent = Math.min(
    100,
    Math.round((referral.usedCount / quota) * 100)
  );

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referral.code);
    setCopied(true);
    showToast(`Kode "${referral.code}" berhasil disalin!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleStatus = async () => {
    if (referral.status === "INACTIVE") {
      await setReferralStatus(referral.id, "ACTIVE");
      showToast(`Kode "${referral.code}" berhasil diaktifkan kembali.`);
    } else {
      await setReferralStatus(referral.id, "INACTIVE");
      showToast(`Kode "${referral.code}" berhasil dinonaktifkan.`);
    }
    await loadData();
  };

  const handleArchive = async () => {
    await archiveReferral(referral.id);
    showToast(`Kode "${referral.code}" berhasil diarsipkan.`);
    await loadData();
  };

  const handleTogglePublic = async () => {
    try {
      const res = await fetch(`/api/admin/referrals/${encodeURIComponent(referral.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !referral.isPublic }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Gagal memperbarui visibilitas publik." }));
        throw new Error(err.message || "Gagal memperbarui visibilitas publik.");
      }
      showToast(referral.isPublic ? `Kode "${referral.code}" disembunyikan dari publik.` : `Kode "${referral.code}" ditampilkan ke publik.`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal memperbarui visibilitas publik.");
    }
  };

  return (
    <div className="space-y-8">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-navy-950 px-5 py-3 text-xs font-bold text-ivory-100 shadow-2xl border border-gold-500/30 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-gold-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/referrals"
            className="rounded-2xl border border-border p-2.5 hover:bg-secondary text-navy-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="rounded-full bg-gold-500/20 px-2.5 py-0.5 text-[10px] font-bold text-gold-700 uppercase">
                {isPercentage ? `${referral.discountValue}% OFF` : `Rp ${referral.discountValue.toLocaleString("id-ID")} OFF`}
              </span>

              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  derivedStatus === "ACTIVE" && "bg-emerald-500/15 text-emerald-700",
                  derivedStatus === "INACTIVE" && "bg-amber-500/15 text-amber-800",
                  derivedStatus === "EXHAUSTED" && "bg-destructive/15 text-destructive",
                  derivedStatus === "EXPIRED" && "bg-gray-200 text-gray-700",
                  derivedStatus === "ARCHIVED" && "bg-gray-100 text-gray-500"
                )}
              >
                <span>{derivedStatus}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl sm:text-3xl font-black text-navy-900 tracking-wider">
                {referral.code}
              </h1>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 rounded-xl bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-gold-500 hover:text-navy-950 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                    <span>Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/admin/referrals/${referral.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Kode</span>
          </Link>

          <button
            type="button"
            onClick={handleToggleStatus}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border",
              referral.status === "INACTIVE"
                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                : "bg-amber-500/10 border-amber-500/30 text-amber-800 hover:bg-amber-500/20"
            )}
          >
            {referral.status === "INACTIVE" ? (
              <>
                <PlayCircle className="h-4 w-4" />
                <span>Aktifkan</span>
              </>
            ) : (
              <>
                <PauseCircle className="h-4 w-4" />
                <span>Nonaktifkan</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleTogglePublic}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border",
              referral.isPublic
                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                : "bg-amber-500/10 border-amber-500/30 text-amber-800 hover:bg-amber-500/20"
            )}
          >
            {referral.isPublic ? (
              <>
                <Eye className="h-4 w-4" />
                <span>Sembunyikan dari Publik</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Tampilkan ke Publik</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleArchive}
            className="rounded-2xl border border-destructive/30 p-2.5 text-destructive hover:bg-destructive/10 transition-colors"
            title="Arsipkan Kode"
          >
            <Archive className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TOTAL PENGGUNAAN
          </span>
          <p className="font-display text-3xl font-black text-emerald-600">
            {referral.usedCount} <span className="text-sm font-semibold text-muted-foreground">Kali</span>
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            BATAS KUOTA
          </span>
          <p className="font-display text-3xl font-black text-navy-900">
            {quota} <span className="text-sm font-semibold text-muted-foreground">Kali</span>
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            SISA KUOTA
          </span>
          <p className="font-display text-3xl font-black text-gold-600">
            {remaining} <span className="text-sm font-semibold text-muted-foreground">Penggunaan</span>
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              PERSENTASE TERPAKAI
            </span>
            <span className="text-xs font-bold text-navy-900">{usedPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gold-500 rounded-full transition-all duration-500"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              Konfigurasi Promo
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-secondary/20 p-3.5 rounded-2xl">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Tipe Diskon
                </span>
                <strong className="text-navy-900 text-sm">
                  {isPercentage ? "Persentase (%)" : "Nominal Tetap (IDR)"}
                </strong>
              </div>

              <div className="bg-secondary/20 p-3.5 rounded-2xl">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Nilai Diskon
                </span>
                <span className="text-navy-900 font-bold text-sm">
                  {isPercentage ? `${referral.discountValue}%` : `Rp ${referral.discountValue.toLocaleString("id-ID")}`}
                </span>
              </div>

              {isPercentage && referral.maxDiscount && (
                <div className="bg-secondary/20 p-3.5 rounded-2xl">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                    Maksimal Diskon (Cap)
                  </span>
                  <span className="text-navy-900 font-bold">
                    Rp {referral.maxDiscount.toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              <div className="bg-secondary/20 p-3.5 rounded-2xl">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Dibuat Pada
                </span>
                <span className="text-navy-900 font-bold">
                  {referral.createdAt || "Agustus 2026"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
                <Calendar className="h-4 w-4 text-gold-600" />
                <span>Periode Berlaku:</span>
              </div>
              <p className="text-xs text-navy-900/80 font-mono">
                {referral.startDate.replace("T", " ")} WIB ➔ {referral.endDate.replace("T", " ")} WIB
              </p>
            </div>

            {referral.description && (
              <div className="space-y-1 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Keterangan Promo:
                </span>
                <p className="text-xs text-navy-900/80 leading-relaxed bg-secondary/30 p-3 rounded-xl">
                  {referral.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 sticky top-24">
          <ReferralPreview formData={referral} />
        </div>
      </div>
    </div>
  );
}
