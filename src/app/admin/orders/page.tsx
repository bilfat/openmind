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
  Loader2,
  Mail,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { LogoSpinner } from "@/components/ui/logo-spinner";

// Must match the payment window used by the cleanup RPC
// (cleanup_expired_orders_rpc p_stale_minutes DEFAULT 30).
import { PAYMENT_WINDOW_HOURS, PAYMENT_WINDOW_MINUTES } from "@/lib/payment-window";

// Merged tab: old-system PENDING_PAYMENT orders (no longer created in the new
// checkout flow) are shown together with DRAFT under "Pesanan Baru Masuk".
const NEW_ORDERS_STATUS = "DRAFT,PENDING_PAYMENT";

function formatRemaining(deadline: number, now: number): string {
  const diff = deadline - now;
  if (diff <= 0) return "Kadaluarsa";
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
  created_by_name: string | null;
  created_by_role: string | null;
  created_at: string;
};

type AdminOrder = OrderItem & {
  databaseId: string;
  status: string;
  source: string;
  issuedTicketCount: number;
  hasTicketEmailJob: boolean;
  createdByName?: string | null;
  createdByRole?: string | null;
  paymentProofUrl?: string;
  paymentDeadline?: number;
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

type ApiIssuedTicket = {
  id: string;
  order_id: string;
  order_code: string;
  ticket_code: string;
  status: string;
  issued_at: string;
  participant: { full_name: string; nim: string; faculty: string; study_program: string; email: string; whatsapp?: string };
  ticket_type: { name: string; code: string; ticket_type: string };
  order: {
    source: string;
    total_amount: number;
    created_at: string | null;
    created_by_name: string | null;
    created_by_role: string | null;
    has_ticket_email_job: boolean;
  };
};

type IssuedTicketRow = {
  id: string;
  orderDatabaseId: string;
  orderId: string;
  ticketCode: string;
  status: string;
  issuedAt: string;
  fullName: string;
  nim: string;
  faculty: string;
  studyProgram: string;
  email: string;
  whatsapp: string;
  ticketName: string;
  totalAmount: number;
  source: string;
  createdAt: string;
  hasTicketEmailJob: boolean;
  createdByName: string | null;
  createdByRole: string | null;
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
    createdByName: order.created_by_name ?? null,
    createdByRole: order.created_by_role ?? null,
    paymentDeadline: new Date(order.created_at).getTime() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000,
  };
}

function toIssuedTicketRow(ticket: ApiIssuedTicket): IssuedTicketRow {
  const participant = ticket.participant ?? {};
  const ticketType = ticket.ticket_type ?? {};
  const order = ticket.order ?? {};
  return {
    id: ticket.id,
    orderDatabaseId: ticket.order_id,
    orderId: ticket.order_code ?? "-",
    ticketCode: ticket.ticket_code,
    status: ticket.status,
    issuedAt: ticket.issued_at,
    fullName: participant.full_name ?? "-",
    nim: participant.nim ?? "-",
    faculty: participant.faculty ?? "-",
    studyProgram: participant.study_program ?? "-",
    email: participant.email ?? "-",
    whatsapp: participant.whatsapp ?? "-",
    ticketName: ticketType.name ?? "-",
    totalAmount: order.total_amount ?? 0,
    source: order.source ?? "ONLINE",
    createdAt: order.created_at ?? "",
    hasTicketEmailJob: order.has_ticket_email_job ?? false,
    createdByName: order.created_by_name ?? null,
    createdByRole: order.created_by_role ?? null,
  };
}

// A per-ticket row maps back to an order-like object so the existing
// review / download / send actions can be reused unchanged.
function toOrderLikeFromTicket(ticket: IssuedTicketRow): AdminOrder {
  return {
    databaseId: ticket.orderDatabaseId,
    orderId: ticket.orderId,
    customerName: ticket.fullName,
    email: ticket.email,
    whatsapp: ticket.whatsapp,
    nim: ticket.nim,
    faculty: ticket.faculty,
    studyProgram: ticket.studyProgram,
    ticketId: ticket.ticketName,
    ticketName: ticket.ticketName,
    ticketCategory: "paid",
    quantity: 1,
    totalPrice: ticket.totalAmount,
    paymentStatus: "approved",
    createdAt: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString("id-ID") : "-",
    checkedIn: false,
    checkedInAt: "",
    status: "TICKET_ISSUED",
    source: ticket.source,
    issuedTicketCount: 1,
    hasTicketEmailJob: ticket.hasTicketEmailJob,
    createdByName: ticket.createdByName,
    createdByRole: ticket.createdByRole,
    paymentDeadline: ticket.createdAt
      ? new Date(ticket.createdAt).getTime() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000
      : Date.now(),
  };
}

function operatorLabel(source: string, name?: string | null, role?: string | null): string | null {
  if (source !== "MANUAL") return null;
  if (!name) return "Walk-in (Manual)";
  const roleLabel = role === "STAFF" ? "Staff" : role === "SUPER_ADMIN" ? "Super Admin" : "Admin";
  return `Walk-in oleh ${roleLabel} ${name}`;
}

function statusBadge(status: string) {
  switch (status) {
    case "DRAFT":
      return { cls: "bg-gold-500/15 text-gold-700", icon: Clock, label: "PESANAN BARU" };
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

function ticketStatusBadge(status: string) {
  switch (status) {
    case "CHECKED_IN":
      return { cls: "bg-sky-500/15 text-sky-700", icon: CheckCircle2, label: "SUDAH HADIR" };
    case "ACTIVE":
      return { cls: "bg-emerald-500/15 text-emerald-700", icon: Ticket, label: "TIKET TERBIT" };
    default:
      return { cls: "bg-secondary/40 text-navy-900", icon: AlertCircle, label: status };
  }
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status") || "all";
  const toast = useToast();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [tickets, setTickets] = useState<IssuedTicketRow[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [issuedTicketCount, setIssuedTicketCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const requestSeq = useRef(0);
  const PAGE_SIZE = 50;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusParam);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sendConfirmOrder, setSendConfirmOrder] = useState<AdminOrder | null>(null);
  const actionLocks = useRef<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Live tick only while any DRAFT (waiting-payment) order is visible,
  // so the "Sisa Waktu" countdown stays current without constant re-renders.
  useEffect(() => {
    const hasPendingDrafts = orders.some((o) => (o.status === "DRAFT" || o.status === "PENDING_PAYMENT") && o.paymentDeadline);
    if (!hasPendingDrafts) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [orders]);

  const refreshOrders = async (targetPage: number, opts?: { showLoading?: boolean }) => {
    const seq = ++requestSeq.current;
    if (opts?.showLoading) setIsFilterLoading(true);
    const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE) });
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);
    const response = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      if (seq === requestSeq.current) setIsFilterLoading(false);
      throw new Error(payload.message || payload.error?.message || "Gagal mengambil pesanan.");
    }
    if (seq !== requestSeq.current) return; // a newer request is already in flight
    const nextOrders = (payload.items ?? []) as ApiOrder[];
    setOrders(statusFilter === "TICKET_ISSUED" ? [] : nextOrders.map(toLegacyOrder));
    setTickets(statusFilter === "TICKET_ISSUED" ? (payload.items ?? []).map(toIssuedTicketRow) : []);
    setStatusCounts(payload.statusCounts ?? {});
    setIssuedTicketCount(payload.issuedTicketCount ?? 0);
    setPagination(payload.pagination ?? { page: targetPage, total: 0, totalPages: 1 });
    setIsFilterLoading(false);
    setLastRefreshed(Date.now());
  };

  // Reset to the first page whenever any filter changes.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, sourceFilter]);

  useEffect(() => {
    // Fetch after the effect commits so the server refresh does not run in the effect body.
    const refresh = () => {
      void refreshOrders(page, { showLoading: true }).catch((error) => console.error(error));
    };
    queueMicrotask(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter, sourceFilter]);

  // Ref yang selalu memegang fungsi refresh TERBARU (page & filter terkini).
  // Dipakai interval polling supaya auto-refresh tidak pernah memakai filter lama.
  const refreshNowRef = useRef<() => void>(() => {});
  useEffect(() => {
    refreshNowRef.current = () => {
      void refreshOrders(page).catch((error) => console.error(error));
    };
  });

  // Auto-refresh berkala agar pesanan baru (di tab manapun) muncul tanpa perlu
  // refresh manual — sama seperti dashboard.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNowRef.current();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > pagination.totalPages) return;
    setPage(targetPage);
  };

  const pageNumbers: number[] = [];
  {
    const total = pagination.totalPages;
    const current = pagination.page;
    const windowStart = Math.max(1, Math.min(current - 2, total - 4));
    const windowEnd = Math.min(total, windowStart + 4);
    for (let p = windowStart; p <= windowEnd; p++) pageNumbers.push(p);
  }

  const displayedStart = pagination.total === 0 ? 0 : (pagination.page - 1) * PAGE_SIZE + 1;
  const displayedEnd = Math.min(pagination.page * PAGE_SIZE, pagination.total);

  const isTicketView = statusFilter === "TICKET_ISSUED";

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
        source: json.order?.source ?? order.source,
        createdByName: json.order?.created_by_profile?.full_name ?? order.createdByName,
        createdByRole: json.order?.created_by_profile?.role ?? order.createdByRole,
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
      await refreshOrders(page).catch((error) => console.error(error));
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
      refreshOrders(page);
      setRejectModalOpen(false);
      setSelectedOrder(null);
      setRejectReason("");
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan jaringan.");
    }
  };

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
        void refreshOrders(page).catch((error) => console.error(error));
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

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 sm:px-5 py-3 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="font-display text-base sm:text-lg font-bold text-navy-900">
            Manajemen Pesanan Tiket
          </h1>
          <p className="text-[10px] sm:text-xs text-navy-900/70 mt-0.5">
            Kelola & verifikasi pembayaran peserta OPEN MIND 2026.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/10 border border-gold-500/30 px-2.5 py-1 font-semibold text-gold-700">
            <RefreshCw className="h-3 w-3 animate-spin [animation-duration:3s]" />
            Auto-refresh 15 detik
          </span>
          <span className="hidden sm:inline">
            Update terakhir: {lastRefreshed ? new Date(lastRefreshed).toLocaleTimeString("id-ID") : "—"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-border bg-white px-4 sm:px-5 py-3 shadow-sm space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2.5">
          {[
            { id: "all", label: "Semua Pesanan", count: statusCounts.ALL ?? orders.length },
            {
              id: NEW_ORDERS_STATUS,
              label: "Pesanan Baru Masuk",
              count: (statusCounts.DRAFT ?? 0) + (statusCounts.PENDING_PAYMENT ?? 0),
            },
            {
              id: "WAITING_VERIFICATION",
              label: "Perlu Verifikasi",
              count: statusCounts.WAITING_VERIFICATION ?? 0,
            },
            {
              id: "TICKET_ISSUED",
              label: "Tiket Diterbitkan",
              count: issuedTicketCount ?? statusCounts.TICKET_ISSUED ?? 0,
            },
            {
              id: "REJECTED",
              label: "Ditolak",
              count: statusCounts.REJECTED ?? 0,
            },
            {
              id: "EXPIRED",
              label: "Kadaluarsa",
              count: statusCounts.EXPIRED ?? 0,
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
          <div className="sm:col-span-9 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari nama, Order ID, NIM, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-xs text-navy-900 placeholder:text-muted-foreground focus:border-gold-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Source Filter (Walk-in / Online) */}
          <div className="sm:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-3 text-xs text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
            >
              <option value="all">Semua Sumber</option>
              <option value="MANUAL">Walk-in</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {isFilterLoading ? (
        <div className="flex h-72 flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-white shadow-sm">
          <LogoSpinner size={56} />
          <p className="text-xs font-semibold text-navy-900">Memuat data...</p>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
            {isTicketView ? (
              <>
                <thead className="bg-navy-900 text-gold-400 uppercase font-bold text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-4 text-center border-b border-navy-700">No</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Kode Tiket</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Order ID</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Peserta</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">NIM</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Fakultas & Prodi</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Tiket</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Status</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Terbit</th>
                    <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-muted-foreground">
                        Tidak ada tiket terbit yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket, index) => {
                      const orderLike = toOrderLikeFromTicket(ticket);
                      const badge = ticketStatusBadge(ticket.status);
                      const BadgeIcon = badge.icon;
                      return (
                        <tr
                          key={ticket.id}
                          className={cn(
                            "transition-colors",
                            index % 2 === 0 ? "bg-white" : "bg-secondary/30",
                            "hover:bg-secondary/50"
                          )}
                        >
                          <td className="px-5 py-4 font-mono font-bold text-navy-900 whitespace-nowrap text-center border-b border-border/70">
                            {(page - 1) * PAGE_SIZE + index + 1}
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-navy-900 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                            {ticket.ticketCode}
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-navy-900 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                            {ticket.orderId}
                            {operatorLabel(ticket.source, ticket.createdByName, ticket.createdByRole) && (
                              <span className="block font-sans text-[9px] font-semibold uppercase tracking-wide text-gold-600 mt-0.5">
                                {operatorLabel(ticket.source, ticket.createdByName, ticket.createdByRole)}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                            <strong className="block text-navy-900 font-bold">
                              {ticket.fullName}
                            </strong>
                            {ticket.whatsapp && (
                              <span className="text-[10px] text-muted-foreground">
                                WA: {ticket.whatsapp}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                            {ticket.nim}
                          </td>
                          <td className="px-5 py-4 max-w-[200px] border-b border-border/70 border-l border-border/70">
                            <span className="text-navy-900 font-medium block truncate">
                              {ticket.studyProgram}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {ticket.faculty}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                            <span className="font-bold text-gold-600">
                              {ticket.ticketName}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                                badge.cls
                              )}
                            >
                              <BadgeIcon className="h-3 w-3" />
                              <span>{badge.label}</span>
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[11px] text-muted-foreground whitespace-nowrap border-b border-border/70 border-l border-border/70">
                            {ticket.issuedAt ? new Date(ticket.issuedAt).toLocaleString("id-ID") : "—"}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReviewOrder(orderLike)}
                                className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Review</span>
                              </button>

                              {canDeliverTickets(orderLike) && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDownload(orderLike)}
                                    disabled={downloadingIds.has(orderLike.databaseId)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-gold-500/15 border border-gold-500/60 px-3 py-1.5 text-xs font-semibold text-gold-700 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {downloadingIds.has(orderLike.databaseId) ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Download className="h-3.5 w-3.5" />
                                    )}
                                    <span>Download Tiket</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSendConfirmOrder(orderLike)}
                                    disabled={sendingIds.has(orderLike.databaseId)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-gold-500 px-3 py-1.5 text-xs font-semibold text-navy-950 hover:bg-gold-600 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {sendingIds.has(orderLike.databaseId) ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Mail className="h-3.5 w-3.5" />
                                    )}
                                    <span>{ticketEmailActionLabel(ticket.hasTicketEmailJob)}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </>
            ) : (
              <>
            <thead className="bg-navy-900 text-gold-400 uppercase font-bold text-[10px] tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-5 py-4 text-center border-b border-navy-700">No</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Order ID</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Peserta</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Fakultas & Prodi</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Tiket</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Total</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Status</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Waktu</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Sisa Waktu</th>
                <th className="px-5 py-4 text-center border-b border-navy-700 border-l border-navy-700">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-muted-foreground">
                    Tidak ada data pesanan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <tr
                    key={order.orderId}
                    className={cn(
                      "transition-colors",
                      index % 2 === 0 ? "bg-white" : "bg-secondary/30",
                      "hover:bg-secondary/50"
                    )}
                  >
                    <td className="px-5 py-4 font-mono font-bold text-navy-900 whitespace-nowrap text-center border-b border-border/70">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-navy-900 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      {order.orderId}
                      {operatorLabel(order.source, order.createdByName, order.createdByRole) && (
                        <span className="block font-sans text-[9px] font-semibold uppercase tracking-wide text-gold-600 mt-0.5">
                          {operatorLabel(order.source, order.createdByName, order.createdByRole)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 border-b border-border/70 border-l border-border/70">
                      <strong className="block text-navy-900 font-bold">
                        {order.customerName}
                      </strong>
                      <span className="text-[10px] text-muted-foreground">
                        NIM: {order.nim} • {order.whatsapp}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-[200px] border-b border-border/70 border-l border-border/70">
                      <span className="text-navy-900 font-medium block truncate">
                        {order.studyProgram}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {order.faculty}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      <span className="font-bold text-gold-600">
                        {order.ticketName}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {order.quantity} Pax
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-navy-900 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      {order.totalPrice === 0
                        ? "GRATIS"
                        : `Rp ${order.totalPrice.toLocaleString("id-ID")}`}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
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
                    <td className="px-5 py-4 text-[11px] text-muted-foreground whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      {order.createdAt}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      {(order.status === "DRAFT" || order.status === "PENDING_PAYMENT") && order.paymentDeadline ? (
                        <span
                          className={cn(
                            "font-mono text-[11px] font-bold tabular-nums",
                            order.paymentDeadline <= now
                              ? "text-destructive"
                              : "text-gold-600"
                          )}
                        >
                          {formatRemaining(order.paymentDeadline, now)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap border-b border-border/70 border-l border-border/70">
                      <div className="flex items-center justify-center gap-1.5">
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
              </>
            )}
          </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="rounded-2xl border border-border bg-white shadow-sm px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Menampilkan {displayedStart}–{displayedEnd} dari {pagination.total} {isTicketView ? "tiket" : "pesanan"}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {pagination.totalPages > 1 &&
            pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={cn(
                  "min-w-9 rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                  p === pagination.page
                    ? "bg-navy-900 text-gold-400 shadow-sm"
                    : "bg-secondary/30 text-navy-900/70 hover:bg-secondary hover:text-navy-900"
                )}
              >
                {p}
              </button>
            ))}

          <button
            type="button"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Selanjutnya</span>
            <ChevronRight className="h-4 w-4" />
          </button>
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
                <span className="text-gold-600 font-bold">{selectedOrder.ticketName} ({selectedOrder.orderParticipants?.length ?? selectedOrder.quantity} Pax) — Rp {selectedOrder.totalPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground font-semibold uppercase text-[10px]">Jumlah Pemesan</span>
                <span className="text-navy-900 font-semibold">{selectedOrder.orderParticipants?.length ?? selectedOrder.quantity}</span>
              </div>
              {operatorLabel(selectedOrder.source, selectedOrder.createdByName, selectedOrder.createdByRole) && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground font-semibold uppercase text-[10px]">Dibuat oleh</span>
                  <span className="text-gold-600 font-bold">
                    {operatorLabel(selectedOrder.source, selectedOrder.createdByName, selectedOrder.createdByRole)}
                  </span>
                </div>
              )}
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

              {selectedOrder.status === "EXPIRED" && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-500/10 px-4 py-2 rounded-xl">
                  <Clock className="h-4 w-4" />
                  <span>Kadaluarsa: {PAYMENT_WINDOW_MINUTES} menit tanpa bukti pembayaran. Kuota telah dilepas — pembeli perlu checkout ulang.</span>
                </div>
              )}

              {(selectedOrder.status === "DRAFT" || selectedOrder.status === "PENDING_PAYMENT") && (
                <div className="flex items-center gap-2 text-xs font-bold text-gold-700 bg-gold-500/10 px-4 py-2 rounded-xl">
                  <Clock className="h-4 w-4" />
                  <span>
                    {selectedOrder.status === "DRAFT" ? "Pesanan baru" : "Menunggu pembayaran"} — belum ada bukti pembayaran.
                    {selectedOrder.paymentDeadline && (
                      <span className="font-mono tabular-nums ml-1">
                        Sisa {formatRemaining(selectedOrder.paymentDeadline, now)}
                      </span>
                    )}
                  </span>
                </div>
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
