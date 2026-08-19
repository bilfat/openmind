"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TicketStatus } from "@/data/tickets";
import { PrivateLinkModal } from "@/components/admin/tickets/private-link-modal";
import {
  Plus,
  Search,
  Lock,
  Globe,
  MoreVertical,
  Edit2,
  Copy,
  PauseCircle,
  PlayCircle,
  Archive,
  Eye,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function AdminTicketsListPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("ALL");

  // Private Link Modal State
  const [privateModalData, setPrivateModalData] = useState<{
    id: string;
    name: string;
    token: string;
  } | null>(null);

  // Active action dropdown
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<any | null>(null);

  const { success, error, warning } = useToast();

  const refreshList = async () => {
    try {
      const res = await fetch("/api/admin/tickets");
      const json = await res.json();
      if (json.success) {
        const mapped = json.data.map((t: any) => ({
          ...t,
          type: t.ticket_type,
          price: Number(t.base_price),
          finalPrice: Number(t.final_price),
          discountPercentage: Number(t.discount_percentage),
          minPurchase: Number(t.min_purchase),
          maxPurchase: Number(t.max_purchase),
          salesStart: t.sales_start_at,
          salesEnd: t.sales_end_at,
          issued: Number(t.quota) - Number(t.remaining_quota || t.quota)
        }));
        setTickets(mapped);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  function getDerivedTicketStatus(t: any): TicketStatus {
    if (t.status === "ARCHIVED" || t.status === "DRAFT" || t.status === "PAUSED") {
      return t.status;
    }
    if (t.issued >= t.quota) {
      return "SOLD_OUT";
    }
    const end = new Date(t.salesEnd).getTime();
    if (!isNaN(end) && Date.now() > end) {
      return "EXPIRED";
    }
    return "ACTIVE";
  }

  const handleDuplicate = async (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

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
        sales_start_at: ticket.salesStart,
        sales_end_at: ticket.salesEnd,
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
        refreshList();
        success(`Tiket "${payload.name}" berhasil diduplikasi.`);
      } else {
        error(`Gagal menduplikasi: ${json.message}`);
      }
    } catch (err: any) {
      error(`Gagal menduplikasi: ${err.message}`);
    }
    setActionMenuOpen(null);
  };

  const handleTogglePause = async (ticket: any, currentDerived: TicketStatus) => {
    const nextStatus = currentDerived === "PAUSED" ? "ACTIVE" : "PAUSED";
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (json.success) {
        success(nextStatus === "ACTIVE" ? `Tiket "${ticket.name}" telah diaktifkan kembali.` : `Penjualan tiket "${ticket.name}" sementara dihentikan (Paused).`);
        refreshList();
      } else {
        error(`Gagal memperbarui status: ${json.message}`);
      }
    } catch (err: any) {
      error(`Gagal memperbarui status: ${err.message}`);
    }
    setActionMenuOpen(null);
  };

  const handleArchive = async (ticket: any) => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' })
      });
      const json = await res.json();
      if (json.success) {
        success(`Tiket "${ticket.name}" berhasil diarsipkan.`);
        refreshList();
      } else {
        error(`Gagal mengarsipkan: ${json.message}`);
      }
    } catch (err: any) {
      error(`Gagal mengarsipkan: ${err.message}`);
    }
    setActionMenuOpen(null);
  };

  const handleDelete = async (ticket: any) => {
    if (!ticket) return;

    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        success(`Tiket "${ticket.name}" berhasil dihapus.`);
        setDeletingTicket(null);
        refreshList();
      } else {
        if (res.status === 409) {
          warning(json.message || "Tiket memiliki riwayat transaksi atau reservasi. Gunakan opsi Arsipkan.");
        } else {
          error(json.message || "Gagal menghapus tiket.");
        }
        setDeletingTicket(null);
      }
    } catch (err: any) {
      error(`Gagal menghapus tiket: ${err.message}`);
      setDeletingTicket(null);
    }
    setActionMenuOpen(null);
  };

  // Filter & Search Logic
  const filteredTickets = tickets.filter((t) => {
    const derivedStatus = getDerivedTicketStatus(t);

    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      derivedStatus === statusFilter ||
      (statusFilter === "ACTIVE" && derivedStatus === "ACTIVE");

    const matchesType = typeFilter === "ALL" || t.type === typeFilter;

    const matchesVisibility =
      visibilityFilter === "ALL" || t.visibility === visibilityFilter;

    // Default: hide ARCHIVED unless explicitly selected in status filter
    if (statusFilter !== "ARCHIVED" && derivedStatus === "ARCHIVED") {
      return false;
    }

    return matchesSearch && matchesStatus && matchesType && matchesVisibility;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 mb-2 border border-gold-500/20">
            <span>SUPER ADMIN ACCESS</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Manajemen Kategori Tiket
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
            Kelola master tiket Free/Paid, Public/Private link pendaftaran, dan kontrol kuota acara.
          </p>
        </div>

        <Link
          href="/admin/tickets/create"
          className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span> Buat Tiket Baru</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-border bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          {[
            { id: "ALL", label: "Semua Status" },
            { id: "ACTIVE", label: "Active" },
            { id: "DRAFT", label: "Draft" },
            { id: "PAUSED", label: "Paused" },
            { id: "SOLD_OUT", label: "Sold Out" },
            { id: "EXPIRED", label: "Expired" },
            { id: "ARCHIVED", label: "Archived" },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setStatusFilter(pill.id)}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer",
                statusFilter === pill.id
                  ? "bg-navy-900 text-gold-400 shadow-sm"
                  : "bg-secondary/40 text-navy-900/70 hover:bg-secondary hover:text-navy-900"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search & Secondary Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ticket name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs font-medium text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Semua Tipe (Free / Paid)</option>
              <option value="FREE">Tipe: FREE</option>
              <option value="PAID">Tipe: PAID</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Semua Visibilitas (Public / Private)</option>
              <option value="PUBLIC">Visibilitas: PUBLIC</option>
              <option value="PRIVATE">Visibilitas: PRIVATE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets DataTable */}
      <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-navy-900 uppercase font-bold text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-5 py-4">Ticket Name</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4">Visibility</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Quota</th>
                <th className="px-5 py-4">Issued / Sisa</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    Belum ada tiket yang sesuai dengan filter atau pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const derivedStatus = getDerivedTicketStatus(ticket);
                  const isFree = ticket.type === "FREE";
                  const isPrivate = ticket.visibility === "PRIVATE";
                  const remaining = Math.max(0, ticket.quota - ticket.issued);

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="font-bold text-navy-900 hover:text-gold-600 transition-colors block text-sm"
                        >
                          {ticket.name}
                        </Link>
                        {ticket.badge && (
                          <span className="inline-block mt-0.5 rounded-full bg-gold-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-gold-600 border border-gold-500/30">
                            {ticket.badge}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {ticket.id}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                            isFree
                              ? "bg-emerald-500/15 text-emerald-700"
                              : "bg-gold-500/20 text-gold-700"
                          )}
                        >
                          {ticket.type}
                        </span>
                      </td>

                      {/* Visibility */}
                      <td className="px-5 py-4">
                        {isPrivate ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPrivateModalData({
                                id: ticket.id,
                                name: ticket.name,
                                token: ticket.privateToken || "X8K29LmQ",
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer"
                          >
                            <Lock className="h-3 w-3" />
                            <span>PRIVATE (Link)</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                            <Globe className="h-3 w-3" />
                            <span>PUBLIC</span>
                          </span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-5 py-4 font-bold text-navy-900">
                        {isFree ? (
                          <span className="text-emerald-600 font-black">Rp 0 (Free)</span>
                        ) : (
                          <div>
                            <span>Rp {ticket.finalPrice.toLocaleString("id-ID")}</span>
                            {ticket.discountPercentage > 0 && (
                              <span className="block text-[10px] text-muted-foreground line-through font-normal">
                                Rp {ticket.price.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Quota */}
                      <td className="px-5 py-4 font-semibold text-navy-900">
                        {ticket.quota} <span className="text-muted-foreground font-normal">Pax</span>
                      </td>

                      {/* Issued / Remaining */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-navy-900 block">
                          {ticket.issued} Terbit
                        </span>
                        <span className="text-[10px] text-gold-600">
                          Sisa {remaining}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
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
                          {derivedStatus === "ACTIVE" && <CheckCircle2 className="h-3 w-3" />}
                          {derivedStatus === "PAUSED" && <PauseCircle className="h-3 w-3" />}
                          {derivedStatus === "SOLD_OUT" && <AlertCircle className="h-3 w-3" />}
                          <span>{derivedStatus.replace("_", " ")}</span>
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td className="px-5 py-4 text-right relative">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/tickets/${ticket.id}`}
                            className="rounded-xl p-2 text-navy-900 hover:bg-secondary transition-colors"
                            title="Lihat Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/admin/tickets/${ticket.id}/edit`}
                            className="rounded-xl p-2 text-navy-900 hover:bg-secondary transition-colors"
                            title="Edit Konfigurasi"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Link>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActionMenuOpen(
                                  actionMenuOpen === ticket.id ? null : ticket.id
                                )
                              }
                              className="rounded-xl p-2 text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {actionMenuOpen === ticket.id && (
                              <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-2xl border border-border bg-white p-1.5 shadow-xl text-left text-xs space-y-1">
                                <Link
                                  href={`/admin/tickets/${ticket.id}`}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-navy-900 hover:bg-secondary"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Lihat Detail Tiket</span>
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(ticket.id)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-navy-900 hover:bg-secondary cursor-pointer"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Duplikasi Tiket</span>
                                </button>

                                {isPrivate && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPrivateModalData({
                                        id: ticket.id,
                                        name: ticket.name,
                                        token: ticket.privateToken || "X8K29LmQ",
                                      });
                                      setActionMenuOpen(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-amber-800 hover:bg-amber-50 cursor-pointer"
                                  >
                                    <Lock className="h-3.5 w-3.5" />
                                    <span>Private Link Manager</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleTogglePause(ticket, derivedStatus)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-navy-900 hover:bg-secondary cursor-pointer"
                                >
                                  {derivedStatus === "PAUSED" ? (
                                    <>
                                      <PlayCircle className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>Aktifkan Kembali</span>
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
                                      <span>Pause Penjualan</span>
                                    </>
                                  )}
                                </button>

                                <div className="border-t border-border my-1" />

                                {derivedStatus !== "ARCHIVED" && (
                                  <button
                                    type="button"
                                    onClick={() => handleArchive(ticket)}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-amber-600 hover:bg-amber-50 cursor-pointer"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                    <span>Arsipkan Tiket</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setDeletingTicket(ticket)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Hapus Kategori Tiket</span>
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

      {/* Private Link Modal */}
      {privateModalData && (
        <PrivateLinkModal
          isOpen={Boolean(privateModalData)}
          ticketId={privateModalData.id}
          ticketName={privateModalData.name}
          privateToken={privateModalData.token}
          onClose={() => setPrivateModalData(null)}
          onTokenUpdated={(newToken) => {
            setPrivateModalData((prev) => (prev ? { ...prev, token: newToken } : null));
            refreshList();
            success("Private link berhasil diperbarui!");
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTicket)}
        title="Hapus Kategori Tiket"
        description={deletingTicket ? `Apakah Anda yakin ingin menghapus kategori tiket "${deletingTicket.name}"? Kategori tiket yang memiliki transaksi atau reservasi aktif hanya boleh diarsipkan.` : ""}
        confirmLabel="Ya, Hapus Tiket"
        onConfirm={() => handleDelete(deletingTicket)}
        onClose={() => setDeletingTicket(null)}
      />
    </div>
  );
}
