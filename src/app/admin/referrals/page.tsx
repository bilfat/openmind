"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ReferralCode, ReferralStatus, DiscountType } from "@/data/referrals";
import {
  getStoredReferrals,
  getDerivedReferralStatus,
  setReferralStatus,
  archiveReferral,
} from "@/lib/referral-store";
import {
  Plus,
  Search,
  Tag,
  Edit2,
  Eye,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  PauseCircle,
  PlayCircle,
  Archive,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralCode[]>(() => getStoredReferrals());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const refreshList = () => {
    setReferrals(getStoredReferrals());
  };


  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Kode "${code}" berhasil disalin!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = (ref: ReferralCode, currentDerived: string) => {
    if (ref.status === "INACTIVE") {
      setReferralStatus(ref.id, "ACTIVE");
      showToast(`Kode referal "${ref.code}" telah diaktifkan kembali.`);
    } else {
      setReferralStatus(ref.id, "INACTIVE");
      showToast(`Kode referal "${ref.code}" telah dinonaktifkan.`);
    }
    refreshList();
    setActionMenuOpen(null);
  };

  const handleArchive = (ref: ReferralCode) => {
    archiveReferral(ref.id);
    refreshList();
    showToast(`Kode referal "${ref.code}" berhasil diarsipkan.`);
    setActionMenuOpen(null);
  };

  // Filter & Search Logic
  const filteredReferrals = referrals.filter((r) => {
    const derivedStatus = getDerivedReferralStatus(r);

    const matchesSearch =
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      derivedStatus === statusFilter ||
      (statusFilter === "ACTIVE" && derivedStatus === "ACTIVE");

    const matchesType = typeFilter === "ALL" || r.discountType === typeFilter;

    // Hide ARCHIVED unless explicitly selected
    if (statusFilter !== "ARCHIVED" && derivedStatus === "ARCHIVED") {
      return false;
    }

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-navy-950 px-5 py-3 text-xs font-bold text-ivory-100 shadow-2xl border border-gold-500/30 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-gold-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 mb-2 border border-gold-500/20">
            <Tag className="h-3 w-3" />
            <span>REFERRAL & PROMO CODES</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Kelola Kode Referal
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
            Buat voucher diskon, pantau kuota pemakaian peserta, dan atur periode promo OPEN MIND 2026.
          </p>
        </div>

        <Link
          href="/admin/referrals/create"
          className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ Buat Kode Referal</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-border bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          {[
            { id: "ALL", label: "Semua Status" },
            { id: "ACTIVE", label: "Active" },
            { id: "INACTIVE", label: "Inactive" },
            { id: "EXHAUSTED", label: "Exhausted (Habis)" },
            { id: "EXPIRED", label: "Expired" },
            { id: "ARCHIVED", label: "Archived" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all",
                statusFilter === pill.id
                  ? "bg-navy-900 text-gold-400 shadow-sm"
                  : "bg-secondary/40 text-navy-900/70 hover:bg-secondary hover:text-navy-900"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search & Type Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search referral code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs font-medium text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Semua Tipe Diskon</option>
              <option value="PERCENTAGE">Persentase (%)</option>
              <option value="FIXED">Nominal Tetap (Rp)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referrals DataTable */}
      <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-navy-900 uppercase font-bold text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-5 py-4">Referral Code</th>
                <th className="px-5 py-4">Discount</th>
                <th className="px-5 py-4">Usage (Used / Quota)</th>
                <th className="px-5 py-4">Remaining</th>
                <th className="px-5 py-4">Validity Period</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReferrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    Belum ada kode referal yang sesuai dengan filter atau pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredReferrals.map((ref) => {
                  const derivedStatus = getDerivedReferralStatus(ref);
                  const isPercentage = ref.discountType === "PERCENTAGE";
                  const quota = ref.usageLimit || 100;
                  const remaining = Math.max(0, quota - ref.usedCount);
                  const usedPercent = Math.min(100, Math.round((ref.usedCount / quota) * 100));

                  return (
                    <tr
                      key={ref.id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      {/* Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/referrals/${ref.id}`}
                            className="font-mono font-black text-sm text-navy-900 hover:text-gold-600 transition-colors bg-secondary/60 px-2.5 py-1 rounded-lg border border-border/70"
                          >
                            {ref.code}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCopy(ref.code)}
                            className="text-muted-foreground hover:text-navy-900 p-1"
                            title="Salin Kode"
                          >
                            {copiedCode === ref.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Discount */}
                      <td className="px-5 py-4 font-bold text-navy-900">
                        {isPercentage ? (
                          <div>
                            <span className="text-gold-700 font-black">{ref.discountValue}% OFF</span>
                            {ref.maxDiscount && (
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                Max Rp {ref.maxDiscount.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-black">
                            Rp {ref.discountValue.toLocaleString("id-ID")} OFF
                          </span>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="px-5 py-4">
                        <div className="space-y-1 max-w-[120px]">
                          <span className="font-semibold text-navy-900 block text-[11px]">
                            {ref.usedCount} / {quota} Kali
                          </span>
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-gold-500 rounded-full"
                              style={{ width: `${usedPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Remaining */}
                      <td className="px-5 py-4">
                        <strong className="text-navy-900 font-bold">{remaining}</strong>{" "}
                        <span className="text-muted-foreground text-[10px]">tersisa</span>
                      </td>

                      {/* Validity */}
                      <td className="px-5 py-4 text-[11px] text-muted-foreground font-mono">
                        {ref.startDate.slice(0, 10)} ➔ {ref.endDate.slice(0, 10)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
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
                          {derivedStatus === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                          {derivedStatus === "INACTIVE" && <PauseCircle className="h-3 w-3" />}
                          {derivedStatus === "EXHAUSTED" && <AlertCircle className="h-3 w-3" />}
                          <span>{derivedStatus}</span>
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/referrals/${ref.id}`}
                            className="rounded-xl p-2 text-navy-900 hover:bg-secondary transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/admin/referrals/${ref.id}/edit`}
                            className="rounded-xl p-2 text-navy-900 hover:bg-secondary transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActionMenuOpen(actionMenuOpen === ref.id ? null : ref.id)
                              }
                              className="rounded-xl p-2 text-muted-foreground hover:bg-secondary transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {actionMenuOpen === ref.id && (
                              <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-2xl border border-border bg-white p-1.5 shadow-xl text-left text-xs space-y-1">
                                <Link
                                  href={`/admin/referrals/${ref.id}`}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-navy-900 hover:bg-secondary"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Lihat Detail</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleToggleActive(ref, derivedStatus)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-navy-900 hover:bg-secondary"
                                >
                                  {ref.status === "INACTIVE" ? (
                                    <>
                                      <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>Aktifkan Kode</span>
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                                      <span>Nonaktifkan</span>
                                    </>
                                  )}
                                </button>

                                <div className="border-t border-border my-1" />

                                <button
                                  type="button"
                                  onClick={() => handleArchive(ref)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-destructive hover:bg-destructive/10"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  <span>Arsipkan Kode</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
