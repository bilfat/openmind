"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TicketStatus } from "@/data/tickets";
import { TicketPreview } from "@/components/admin/tickets/ticket-preview";
import { PrivateLinkModal } from "@/components/admin/tickets/private-link-modal";
import {
  ArrowLeft,
  Edit2,
  Lock,
  Globe,
  Copy,
  Check,
  RefreshCw,
  MoreVertical,
  PauseCircle,
  PlayCircle,
  Archive,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = (params?.ticketId as string) || "";

  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [privateModalOpen, setPrivateModalOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTicket = async () => {
    if (!ticketId) return;
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const json = await res.json();
      if (json.success) {
        const t = json.data;
        setTicket({
          ...t,
          type: t.ticket_type,
          price: Number(t.base_price),
          discountPercentage: Number(t.discount_percentage),
          finalPrice: Number(t.final_price),
          benefits: t.benefits || [],
        });
      }
    } catch (err) {
      console.error("Failed to load ticket:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-semibold text-gold-600 animate-pulse bg-white rounded-3xl border border-border shadow-sm">
        Memuat detail konfigurasi tiket...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-12 text-center space-y-4 bg-white rounded-3xl border border-border shadow-sm">
        <p className="text-sm text-muted-foreground font-light">
          Jenis tiket tidak ditemukan atau telah dihapus dari database.
        </p>
        <Link
          href="/admin/tickets"
          className="inline-flex items-center gap-1.5 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Tiket</span>
        </Link>
      </div>
    );
  }

  function getDerivedTicketStatus(t: any): string {
    if (t.status === "ARCHIVED" || t.status === "DRAFT" || t.status === "PAUSED") {
      return t.status;
    }
    if (t.issued >= t.quota) {
      return "SOLD_OUT";
    }
    const end = new Date(t.sales_end_at).getTime();
    if (!isNaN(end) && Date.now() > end) {
      return "EXPIRED";
    }
    return "ACTIVE";
  }

  const derivedStatus = getDerivedTicketStatus(ticket);
  const isFree = ticket.ticket_type === "FREE";
  const isPrivate = ticket.visibility === "PRIVATE";
  const remaining = Math.max(0, Number(ticket.quota) - Number(ticket.issued));
  const salesPercent = Math.min(
    100,
    Math.round((ticket.issued / ticket.quota) * 100)
  );

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://openmind.id";
  const inviteUrl = isPrivate && ticket.privateToken ? `${origin}/invite/${ticket.privateToken}` : "";

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    showToast("Private link pendaftaran berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDuplicate = async () => {
    try {
      const payload = {
        name: `${ticket.name} (Copy)`,
        code: `${ticket.code.slice(0, 5)}CP${Date.now().toString().slice(-3)}`,
        description: ticket.description,
        ticket_type: ticket.ticket_type,
        visibility: ticket.visibility,
        base_price: Number(ticket.base_price),
        discount_percentage: Number(ticket.discount_percentage),
        quota: Number(ticket.quota),
        min_purchase: Number(ticket.min_purchase),
        max_purchase: Number(ticket.max_purchase),
        sales_start_at: ticket.sales_start_at,
        sales_end_at: ticket.sales_end_at,
        benefits: ticket.benefits,
        status: 'DRAFT',
      };
      
      const res = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/admin/tickets/${json.data.id}`);
      } else {
        showToast(`Gagal menduplikasi: ${json.message}`);
      }
    } catch (err: any) {
      showToast(`Gagal menduplikasi: ${err.message}`);
    }
  };

  const handleTogglePause = async () => {
    const nextStatus = derivedStatus === "PAUSED" ? "ACTIVE" : "PAUSED";
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (json.success) {
        showToast(nextStatus === "ACTIVE" ? "Tiket berhasil diaktifkan kembali." : "Penjualan tiket berhasil dihentikan (Paused).");
        loadTicket();
      } else {
        showToast(`Gagal memperbarui status: ${json.message}`);
      }
    } catch (err: any) {
      showToast(`Gagal memperbarui status: ${err.message}`);
    }
    setActionMenuOpen(false);
  };

  const handleArchive = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' })
      });
      const json = await res.json();
      if (json.success) {
        showToast("Tiket berhasil diarsipkan.");
        loadTicket();
      } else {
        showToast(`Gagal mengarsipkan: ${json.message}`);
      }
    } catch (err: any) {
      showToast(`Gagal mengarsipkan: ${err.message}`);
    }
    setActionMenuOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-navy-950 px-5 py-3 text-xs font-bold text-ivory-100 shadow-2xl border border-gold-500/30 flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-gold-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/tickets"
            className="rounded-2xl border border-border p-2.5 hover:bg-secondary text-navy-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                  isFree
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-gold-500/20 text-gold-700"
                )}
              >
                {ticket.ticket_type}
              </span>

              {isPrivate ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-500/30">
                  <Lock className="h-3 w-3" />
                  <span>PRIVATE</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                  <Globe className="h-3 w-3" />
                  <span>PUBLIC</span>
                </span>
              )}

              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  derivedStatus === "ACTIVE" && "bg-emerald-500/15 text-emerald-700",
                  derivedStatus === "DRAFT" && "bg-secondary text-navy-900/70 border border-border",
                  derivedStatus === "PAUSED" && "bg-amber-500/15 text-amber-800",
                  derivedStatus === "SOLD_OUT" && "bg-destructive/15 text-destructive",
                  derivedStatus === "EXPIRED" && "bg-gray-200 text-gray-700",
                  derivedStatus === "ARCHIVED" && "bg-gray-100 text-gray-500"
                )}
              >
                <span>{derivedStatus.replace("_", " ")}</span>
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-black text-navy-900">
              {ticket.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 relative self-start sm:self-auto">
          <Link
            href={`/admin/tickets/${ticket.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gold-500 px-5 py-2.5 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Tiket</span>
          </Link>

          <button
            type="button"
            onClick={() => setActionMenuOpen(!actionMenuOpen)}
            className="rounded-2xl border border-border p-2.5 hover:bg-secondary text-navy-900 transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {/* Action Dropdown Menu */}
          {actionMenuOpen && (
            <div className="absolute right-0 top-full mt-2 z-30 w-52 rounded-2xl border border-border bg-white p-1.5 shadow-xl text-left text-xs space-y-1">
              <button
                type="button"
                onClick={handleDuplicate}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-navy-900 hover:bg-secondary"
              >
                <span>Duplikasi Tiket Ini</span>
              </button>

              {isPrivate && (
                <button
                  type="button"
                  onClick={() => {
                    setPrivateModalOpen(true);
                    setActionMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-amber-800 hover:bg-amber-50"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Kelola Private Link</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTogglePause}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-navy-900 hover:bg-secondary"
              >
                {derivedStatus === "PAUSED" ? (
                  <>
                    <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Aktifkan Penjualan</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Pause Penjualan</span>
                  </>
                )}
              </button>

              <div className="border-t border-border my-1" />

              <button
                type="button"
                onClick={handleArchive}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-destructive hover:bg-destructive/10"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Arsipkan Tiket</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TOTAL KUOTA
          </span>
          <p className="font-display text-3xl font-black text-navy-900">
            {ticket.quota} <span className="text-sm font-semibold text-muted-foreground">Pax</span>
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            TERBIT / TERJUAL
          </span>
          <p className="font-display text-3xl font-black text-emerald-600">
            {ticket.issued} <span className="text-sm font-semibold text-muted-foreground">Tiket</span>
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            SISA KUOTA
          </span>
          <p className="font-display text-3xl font-black text-gold-600">
            {remaining} <span className="text-sm font-semibold text-muted-foreground">Tiket</span>
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              PERSENTASE TERJUAL
            </span>
            <span className="text-xs font-bold text-navy-900">{salesPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gold-500 rounded-full transition-all duration-500"
              style={{ width: `${salesPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Details & Live Preview Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Configuration & Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* PRIVATE ACCESS SECTION (Only if Private) */}
          {isPrivate && (
            <div className="rounded-3xl border-2 border-amber-500/40 bg-amber-500/10 p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900">
                  <Lock className="h-5 w-5 text-amber-700" />
                  <h3 className="font-display text-lg font-bold">
                    Private Registration Access
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-500/30">
                  ● Link Aktif
                </span>
              </div>

              <p className="text-xs text-amber-900/80 leading-relaxed font-light">
                Tiket ini bersifat <strong>Private</strong> dan tidak dapat ditemukan di katalog publik. Peserta hanya bisa mendaftar melalui tautan khusus di bawah:
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white rounded-2xl border border-amber-500/30 p-2 shadow-sm">
                <span className="flex-1 truncate px-3 font-mono text-xs font-bold text-navy-900">
                  {inviteUrl}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-gold-400 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrivateModalOpen(true)}
                    className="rounded-xl border border-border p-2 hover:bg-secondary text-navy-900 transition-colors"
                    title="Regenerate Token"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ticket Configuration Card */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="font-display text-lg font-bold text-navy-900 border-b border-border pb-3">
              Konfigurasi Tiket
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-secondary/20 p-3.5 rounded-2xl">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Nama Tiket
                </span>
                <strong className="text-navy-900 text-sm">{ticket.name}</strong>
              </div>

              <div className="bg-secondary/20 p-3.5 rounded-2xl">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Tipe & Visibilitas
                </span>
                <span className="text-navy-900 font-bold">
                  {ticket.ticket_type} · {ticket.visibility}
                </span>
              </div>

              <div className="bg-secondary/20 p-3.5 rounded-2xl">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Harga & Diskon
                </span>
                <span className="text-navy-900 font-bold">
                  {isFree
                    ? "GRATIS (Rp 0)"
                    : `Rp ${Number(ticket.final_price).toLocaleString("id-ID")}`}{" "}
                  {Number(ticket.discount_percentage) > 0 && (
                    <span className="text-emerald-600 font-semibold">
                      ({ticket.discount_percentage}% OFF)
                    </span>
                  )}
                </span>
              </div>

              <div className="bg-secondary/20 p-3.5 rounded-2xl">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Batas Pembelian
                </span>
                <span className="text-navy-900 font-bold">
                  {ticket.min_purchase} s/d {ticket.max_purchase} Tiket / Transaksi
                </span>
              </div>
            </div>

            {/* Sales Period */}
            <div className="rounded-2xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-navy-900">
                <Calendar className="h-4 w-4 text-gold-600" />
                <span>Periode Penjualan:</span>
              </div>
              <p className="text-xs text-navy-900/80 font-mono">
                {ticket.sales_start_at.replace("T", " ").replace("Z", "").substring(0, 16)} WIB ➔ {ticket.sales_end_at.replace("T", " ").replace("Z", "").substring(0, 16)} WIB
              </p>
            </div>

            {/* Benefits List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
                Daftar Hak Akses / Benefit Peserta:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ticket.benefits.map((b: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl bg-secondary/30 p-2.5 text-xs text-navy-900"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-gold-600 flex-shrink-0" />
                    <span className="truncate">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Guest Ticket Card Preview */}
        <div className="lg:col-span-5 sticky top-24">
          <TicketPreview formData={ticket} />
        </div>
      </div>

      {/* Private Link Modal */}
      {privateModalOpen && isPrivate && ticket.privateToken && (
        <PrivateLinkModal
          isOpen={privateModalOpen}
          ticketId={ticket.id}
          ticketName={ticket.name}
          privateToken={ticket.privateToken}
          onClose={() => setPrivateModalOpen(false)}
          onTokenUpdated={(newToken) => {
            loadTicket();
            showToast("Private link berhasil diperbarui!");
          }}
        />
      )}
    </div>
  );
}
