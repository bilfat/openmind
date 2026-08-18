"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { OrderItem } from "@/lib/order-store";
import { canDeliverTickets, ticketEmailActionLabel, withActionLock } from "@/lib/admin-order-actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Search,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Ticket,
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type ApiOrder = {
  id: string;
  order_code: string;
  status: string;
  source: string;
  total_amount: number;
  participant_count: number;
  issued_ticket_count: number;
  has_ticket_email_job: boolean;
  participants: Array<{ full_name: string; email: string; nim: string; faculty: string; study_program: string; whatsapp?: string }>;
  ticket_types: string[];
  created_at: string;
};

type AdminOrder = OrderItem & {
  databaseId: string;
  status: string;
  source: string;
  issuedTicketCount: number;
  hasTicketEmailJob: boolean;
  paymentProofUrl?: string;
  orderParticipants?: OrderParticipantDetail[];
};

type OrderParticipantDetail = {
  fullName: string;
  email: string;
  whatsapp: string;
  nim: string;
  faculty: string;
  studyProgram: string;
  instagram?: string;
  ticketName: string;
};

function toLegacyOrder(order: ApiOrder): AdminOrder {
  const participant = order.participants[0];
  return {
    databaseId: order.id,
    orderId: order.order_code,
    customerName: participant?.full_name ?? "-",
    email: participant?.email ?? "-",
    whatsapp: participant?.whatsapp ?? "-",
    nim: participant?.nim ?? "-",
    faculty: participant?.faculty ?? "-",
    studyProgram: participant?.study_program ?? "-",
    ticketId: order.ticket_types[0] ?? "-",
    ticketName: order.ticket_types.join(", ") || "-",
    ticketCategory: "paid",
    quantity: order.participant_count,
    totalPrice: order.total_amount,
    paymentStatus: order.status === "REJECTED"
      ? "rejected"
      : order.status === "APPROVED" || order.status === "TICKET_ISSUED"
        ? "approved"
        : "pending",
    createdAt: new Date(order.created_at).toLocaleString("id-ID"),
    checkedIn: false,
    checkedInAt: "",
    status: order.status,
    source: order.source,
    issuedTicketCount: order.issued_ticket_count,
    hasTicketEmailJob: order.has_ticket_email_job,
  };
}

function statusBadge(status: string) {
  switch (status) {
    case "TICKET_ISSUED":
      return { cls: "bg-emerald-500/15 text-emerald-700", icon: Ticket, label: "TIKET DITERBITKAN" };
    case "APPROVED":
      return { cls: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle2, label: "DISETUJUI" };
    case "WAITING_VERIFICATION":
      return { cls: "bg-orange-500/15 text-orange-700", icon: Clock, label: "PERLU VERIFIKASI" };
    case "PENDING_PAYMENT":
      return { cls: "bg-orange-500/15 text-orange-700", icon: Clock, label: "MENUNGGU PEMBAYARAN" };
    case "REJECTED":
      return { cls: "bg-destructive/15 text-destructive", icon: XCircle, label: "DITOLAK" };
    case "CANCELLED":
      return { cls: "bg-rose-500/15 text-rose-700", icon: XCircle, label: "DIBATALKAN" };
    case "EXPIRED":
      return { cls: "bg-slate-500/15 text-slate-600", icon: Clock, label: "KADALUARSA" };
    default:
      return { cls: "bg-secondary/40 text-navy-900", icon: AlertCircle, label: status };
  }
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status") || "all";
  const toast = useToast();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusParam);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sendConfirmOrder, setSendConfirmOrder] = useState<AdminOrder | null>(null);
  const actionLocks = useRef<Set<string>>(new Set());

  const refreshOrders = async () => {
    const params = new URLSearchParams({ page: "1", limit: "50" });
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (ticketFilter !== "all") params.set("ticket_type", ticketFilter);
    if (facultyFilter !== "all") params.set("faculty", facultyFilter);
    const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Gagal mengambil pesanan.");
    const nextOrders = (payload.items ?? []) as ApiOrder[];
    setOrders(nextOrders.map(toLegacyOrder));
  };

  useEffect(() => {
    // Fetch after the effect commits so the server refresh does not run in the effect body.
    const refresh = () => { void refreshOrders().catch((error) => console.error(error)); };
    queueMicrotask(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, ticketFilter, facultyFilter]);

  const handleReviewOrder = async (order: AdminOrder) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.databaseId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat detail pesanan.");
      }
      const payments = json.payments || [];
      const latestPayment = payments[0];
      const proofUrl = latestPayment?.proof_url || null;

      // Build the full participant list from the fresh detail payload so every
      // ticket holder (multi-ticket orders) is shown, and use the authoritative
      // order status from the DB instead of the stale list row.
      const orderParticipants: OrderParticipantDetail[] = (json.order_items || []).map((oi: any) => ({
        fullName: oi.participant?.full_name ?? "-",
        email: oi.participant?.email ?? "-",
        whatsapp: oi.participant?.whatsapp ?? "-",
        nim: oi.participant?.nim ?? "-",
        faculty: oi.participant?.faculty ?? "-",
        studyProgram: oi.participant?.study_program ?? "-",
        instagram: oi.participant?.instagram_username ?? "",
        ticketName: oi.ticket_type?.name ?? "-",
      }));
      const primary = orderParticipants[0];

      setSelectedOrder({
        ...order,
        status: json.order?.status ?? order.status,
        customerName: primary?.fullName ?? order.customerName,
        email: primary?.email ?? order.email,
        whatsapp: primary?.whatsapp ?? order.whatsapp,
        nim: primary?.nim ?? order.nim,
        faculty: primary?.faculty ?? order.faculty,
        studyProgram: primary?.studyProgram ?? order.studyProgram,
        orderParticipants,
        paymentProofUrl: proofUrl,
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Gagal memuat detail pesanan.");
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Gagal menyetujui pesanan.");
        return;
      }
      // Reflect the authoritative status from the DB (APPROVED / TICKET_ISSUED)
      // so the UI never keeps showing the stale "menunggu" state.
      if (data.status) {
        setOrders((prev) =>
          prev.map((o) => (o.databaseId === orderId ? { ...o, status: data.status } : o))
        );
        setSelectedOrder((prev) =>
          prev && prev.databaseId === orderId ? { ...prev, status: data.status } : prev
        );
      }
      alert("Pesanan berhasil disetujui!");
      await refreshOrders().catch((error) => console.error(error));
      setSelectedOrder(null);
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  const handleReject = async (orderId: string) => {
    if (!rejectReason.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectReason })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Gagal menolak pesanan.");
        return;
      }
      alert("Pesanan berhasil ditolak!");
      refreshOrders();
      setRejectModalOpen(false);
      setSelectedOrder(null);
      setRejectReason("");
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    }
  };

  // Filtering
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    const matchesTicket =
      ticketFilter === "all" || order.ticketId === ticketFilter;

    const matchesFaculty =
      facultyFilter === "all" || order.faculty.includes(facultyFilter);

    return matchesSearch && matchesStatus && matchesTicket && matchesFaculty;
  });

  const handleDownload = async (order: AdminOrder) => {
    await withActionLock(actionLocks.current, `download:${order.databaseId}`, async () => {
      setDownloadingIds((prev) => new Set(prev).add(order.databaseId));
      try {
        const res = await fetch(`/api/admin/orders/${order.databaseId}/download-tickets`, { cache: "no-store" });
        if (!res.ok) {
          let message = "Gagal mengunduh tiket.";
          try {
            const data = await res.json();
            if (data?.message) message = data.message;
          } catch {
            // ignore non-JSON error body
          }
          toast.error(message);
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filenameMatch?.[1] ?? `${order.orderId}-tickets.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Tiket berhasil diunduh.");
      } catch (err) {
        console.error(err);
        toast.error("Terjadi kesalahan jaringan saat mengunduh tiket.");
      } finally {
        setDownloadingIds((prev) => {
          const next = new Set(prev);
          next.delete(order.databaseId);
          return next;
        });
      }
    });
  };

  const handleSendTicket = async (order: AdminOrder) => {
    const isResend = order.hasTicketEmailJob;
    await withActionLock(actionLocks.current, `send:${order.databaseId}`, async () => {
      setSendingIds((prev) => new Set(prev).add(order.databaseId));
      try {
        const res = await fetch(`/api/admin/orders/${order.databaseId}/send-tickets`, {
          method: "POST",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data?.message || "Gagal mengirim e-ticket.");
          return;
        }
        toast.success(isResend ? "E-tiket berhasil dikirim ulang." : "e-tiket berhasil dikirim ke email peserta.");
        setSendConfirmOrder(null);
        void refreshOrders().catch((error) => console.error(error));
      } catch (err) {
        console.error(err);
        toast.error("Gagal mengirim e-ticket.");
      } finally {
        setSendingIds((prev) => {
          const next = new Set(prev);
          next.delete(order.databaseId);
          return next;
        });
      }
    });
  };

  const exportCSV = () => {
    const headers = [
      "Order ID",
      "Nama Peserta",
      "Email",
      "WhatsApp",
      "NIM",
      "Fakultas",
      "Prodi",
      "Tiket",
      "Jumlah",
      "Total Bayar",
      "Status",
      "Waktu Daftar",
    ];

    const rows = filteredOrders.map((o) => [
      o.orderId,
      `"${o.customerName}"`,
      o.email,
      o.whatsapp,
      o.nim,
      `"${o.faculty}"`,
      `"${o.studyProgram}"`,
      o.ticketName,
      o.quantity,
      o.totalPrice,
      o.paymentStatus,
      `"${o.createdAt}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `peserta_open_mind_2026_${statusFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Manajemen Pesanan Tiket
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
            Kelola, verifikasi pembayaran struk transfer, dan ekspor data peserta OPEN MIND 2026.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Ekspor Data (CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-border bg-white p-5 sm:p-6 shadow-sm space-y-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
          {[
            { id: "all", label: "Semua Pesanan", count: orders.length },
            {
              id: "PENDING_PAYMENT",
              label: "Menunggu Pembayaran",
              count: orders.filter((o) => o.status === "PENDING_PAYMENT").length,
            },
            {
              id: "WAITING_VERIFICATION",
              label: "Perlu Verifikasi",
              count: orders.filter((o) => o.status === "WAITING_VERIFICATION").length,
            },
            {
              id: "APPROVED",
              label: "Disetujui",
              count: orders.filter((o) => o.status === "APPROVED").length,
            },
            {
              id: "TICKET_ISSUED",
              label: "Tiket Diterbitkan",
              count: orders.filter((o) => o.status === "TICKET_ISSUED").length,
            },
            {
              id: "REJECTED",
              label: "Ditolak",
              count: orders.filter((o) => o.status === "REJECTED").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                statusFilter === tab.id
                  ? "bg-navy-900 text-gold-400 shadow-sm"
                  : "bg-secondary/40 text-navy-900/70 hover:bg-secondary hover:text-navy-900"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px]",
                  statusFilter === tab.id
                    ? "bg-gold-500 text-navy-950"
                    : "bg-border text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Secondary Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama, Order ID, NIM, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Ticket Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Jenis Tiket</option>
              <option value="free-pass">FREE PASS</option>
              <option value="early-bird">EARLY BIRD</option>
              <option value="regular-pass">NORMAL PASS</option>
              <option value="vip-pass">VIP PASS</option>
            </select>
          </div>

          {/* Faculty Filter */}
          <div className="sm:col-span-3">
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Fakultas</option>
              <option value="Terapan">Fakultas Ilmu Terapan (FIT)</option>
              <option value="Kreatif">Fakultas Industri Kreatif (FIK)</option>
              <option value="Informatika">Fakultas Informatika (FIF)</option>
              <option value="Elektro">Fakultas Teknik Elektro (FTE)</option>
              <option value="Rekayasa">Fakultas Rekayasa Industri (FRI)</option>
              <option value="Ekonomi">Fakultas Ekonomi dan Bisnis (FEB)</option>
              <option value="Komunikasi">Fakultas Komunikasi Sosial (FKS)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-navy-900 uppercase font-bold text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-5 py-4">Order ID</th>
                <th className="px-5 py-4">Peserta</th>
                <th className="px-5 py-4">Fakultas & Prodi</th>
                <th className="px-5 py-4">Tiket</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Waktu</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    Tidak ada data pesanan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-navy-900 whitespace-nowrap">
                      {order.orderId}
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-navy-900 font-bold">
                        {order.customerName}
                      </strong>
                      <span className="text-[10px] text-muted-foreground">
                        NIM: {order.nim} • {order.whatsapp}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <span className="text-navy-900 font-medium block truncate">
                        {order.studyProgram}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {order.faculty}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-bold text-gold-600">
                        {order.ticketName}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {order.quantity} Pax
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-navy-900 whitespace-nowrap">
                      {order.totalPrice === 0
                        ? "GRATIS"
                        : `Rp ${order.totalPrice.toLocaleString("id-ID")}`}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {(() => {
                        const badge = statusBadge(order.status);
                        const BadgeIcon = badge.icon;
                        return (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                              badge.cls
                            )}
                          >
                            <BadgeIcon className="h-3 w-3" />
                            <span>{badge.label}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4 text-[11px] text-muted-foreground whitespace-nowrap">
                      {order.createdAt}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReviewOrder(order)}
                          className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Review</span>
                        </button>

                        {canDeliverTickets(order) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDownload(order)}
                              disabled={downloadingIds.has(order.databaseId)}
                              className="inline-flex items-center gap-1 rounded-xl bg-gold-500/15 border border-gold-500/60 px-3 py-1.5 text-xs font-semibold text-gold-700 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {downloadingIds.has(order.databaseId) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              <span>Download Tiket</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSendConfirmOrder(order)}
                              disabled={sendingIds.has(order.databaseId)}
                              className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-3 py-1.5 text-xs font-semibold text-navy-950 hover:bg-gold-600 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {sendingIds.has(order.databaseId) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="h-3.5 w-3.5" />
                              )}
                              <span>{ticketEmailActionLabel(order.hasTicketEmailJob)}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review / Verification Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  VERIFIKASI & DETAIL PESANAN
                </span>
                <h3 className="font-display text-2xl font-bold text-navy-900">
                  {selectedOrder.orderId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Order Summary (no participant duplication) */}
            <div className="rounded-2xl bg-secondary/30 p-4 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-muted-foreground font-semibold uppercase text-[10px]">Tiket & Tagihan</span>
                <span className="text-gold-600 font-bold">{selectedOrder.ticketName} ({selectedOrder.quantity} Pax) — Rp {selectedOrder.totalPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground font-semibold uppercase text-[10px]">Jumlah Pemesan</span>
                <span className="text-navy-900 font-semibold">{selectedOrder.orderParticipants?.length ?? selectedOrder.quantity}</span>
              </div>
            </div>

            {/* All Participants */}
            {selectedOrder.orderParticipants && selectedOrder.orderParticipants.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase text-navy-900">
                  Daftar Pemesan ({selectedOrder.orderParticipants.length})
                </span>
                <div className="space-y-2">
                  {selectedOrder.orderParticipants.map((p, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-secondary/20 overflow-hidden">
                      <div className="flex items-center justify-between gap-2 bg-navy-900 px-4 py-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                          Pemesan {i + 1}
                        </span>
                        <span className="rounded-full bg-gold-500/20 px-2.5 py-0.5 text-[10px] font-bold text-gold-300">
                          {p.ticketName}
                        </span>
                      </div>
                      <div className="p-4 text-xs space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-navy-900/80">
                          <span>Nama: <strong className="text-navy-900">{p.fullName}</strong></span>
                          <span>NIM: <strong className="text-navy-900">{p.nim}</strong></span>
                          <span>Fakultas: <strong className="text-navy-900">{p.faculty}</strong></span>
                          <span>Prodi: <strong className="text-navy-900">{p.studyProgram}</strong></span>
                          <span>WA: <strong className="text-navy-900">{p.whatsapp}</strong></span>
                          <span>Email: <strong className="text-navy-900">{p.email}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uploaded Payment Proof */}
            {selectedOrder.paymentProofUrl && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-navy-900">
                  Foto Bukti Transfer:
                </span>
                <div className="relative aspect-[16/9] max-h-60 w-full rounded-2xl overflow-hidden border border-border bg-black">
                  <Image
                    src={selectedOrder.paymentProofUrl}
                    alt="Bukti Transfer"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              {selectedOrder.status === "WAITING_VERIFICATION" && (
                <>
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-destructive/10 px-5 py-3 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Tolak Pembayaran</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(selectedOrder.databaseId)}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Setujui (Approve)</span>
                  </button>
                </>
              )}

              {(selectedOrder.status === "APPROVED" || selectedOrder.status === "TICKET_ISSUED") && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-500/15 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{selectedOrder.status === "TICKET_ISSUED" ? "Tiket Telah Diterbitkan" : "Pesanan Telah Disetujui"}</span>
                </div>
              )}

              {selectedOrder.status === "REJECTED" && (
                <button
                  type="button"
                  onClick={() => handleApprove(selectedOrder.databaseId)}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ubah ke Disetujui (Approve)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 space-y-4 shadow-2xl">
            <h4 className="font-display text-lg font-bold text-navy-900">
              Alasan Penolakan Pembayaran
            </h4>
            <p className="text-xs text-muted-foreground">
              Pilih alasan agar peserta dapat membaca instruksi perbaikan:
            </p>

            <div className="space-y-2">
              {[
                "Nominal transfer tidak sesuai dengan total tagihan.",
                "Foto struk bukti transfer buram atau tidak terbaca.",
                "Rekening tujuan bukan rekening resmi HIPMI Telkom University.",
                "Bukti transfer terindikasi palsu / editan.",
              ].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectReason(reason)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border text-xs transition-colors",
                    rejectReason === reason
                      ? "border-destructive bg-destructive/10 text-destructive font-bold"
                      : "border-border hover:bg-secondary/30"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleReject(selectedOrder.databaseId)}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-white hover:bg-destructive/90 shadow-md"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send / Resend Ticket Confirmation */}
      {sendConfirmOrder && (
        <ConfirmDialog
          isOpen
          title={sendConfirmOrder.hasTicketEmailJob ? "Kirim Ulang E-Ticket" : "Kirim E-Ticket"}
          description={`Yakin ingin ${sendConfirmOrder.hasTicketEmailJob ? "mengirim ulang" : "mengirim"} e-ticket ke email peserta ${sendConfirmOrder.email}? Order: ${sendConfirmOrder.orderId}.`}
          confirmLabel={sendConfirmOrder.hasTicketEmailJob ? "Ya, Kirim Ulang" : "Ya, Kirim"}
          isDestructive={false}
          onConfirm={() => handleSendTicket(sendConfirmOrder)}
          onClose={() => setSendConfirmOrder(null)}
        />
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm font-semibold text-gold-600 animate-pulse">
          Memuat Data Pesanan...
        </div>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}
