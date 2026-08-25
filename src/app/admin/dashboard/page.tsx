"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  Clock,
  ScanLine,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Ticket,
  Wallet,
  Inbox,
  Tag,
  ShieldCheck,
  PackagePlus,
  Info,
  ClipboardCheck,
  Store,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  PauseCircle,
  FileText,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_WINDOW_HOURS } from "@/lib/payment-window";
import { getDerivedReferralStatus } from "@/lib/referral-store";

interface DashboardOrder {
  id: string;
  order_code: string;
  status: string;
  total_amount: number;
  created_at: string;
  participants?: Array<{ full_name?: string }>;
}

interface MultiPaxTicketItem {
  ticket_code: string | null;
  full_name: string;
  nim: string;
  email: string;
  whatsapp: string;
  faculty: string;
  ticket_name: string;
  ticket_type: string;
}

interface MultiPaxOrder {
  order_id: string;
  order_code: string;
  created_at: string | null;
  status: string | null;
  ticketCount: number;
  items: MultiPaxTicketItem[];
}

interface RevenueBreakdownRow {
  ticket_name: string;
  price: number;
  count: number;
  total: number;
}

interface RevenueDiscountRow {
  code: string;
  order_code: string;
  discount: number;
  tickets: { name: string; unit_price: number; count: number }[];
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingVerification: number;
  pendingTickets: number;
  issuedOrders: number;
  issuedTicketOrders: number;
  newOrders: number;
  multiPaxOrders: MultiPaxOrder[];
  revenueBreakdown: {
    issued: RevenueBreakdownRow[];
    pending: RevenueBreakdownRow[];
    discounts: RevenueDiscountRow[];
    totalDiscount: number;
  };
}

interface SummaryTicket {
  id: string;
  name: string;
  code: string;
  ticketType: string;
  quota: number;
  finalPrice: number;
  issued: number;
  pending: number;
  remaining: number;
}

interface SummaryReferral {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
}

interface DashboardSummary {
  role: "SUPER_ADMIN" | "ADMIN";
  activeTickets: { total: number; items: SummaryTicket[] };
  activeReferrals: { total: number; items: SummaryReferral[] } | null;
}

interface ReviewParticipant {
  fullName: string;
  email: string;
  whatsapp: string;
  nim: string;
  faculty: string;
  studyProgram: string;
  instagram: string;
  ticketName: string;
}

interface ReviewDetail {
  id: string;
  orderCode: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  source: string;
  participants: ReviewParticipant[];
  paymentProofUrl: string | null;
  rejectionReason: string;
}

interface ReviewOrderItem {
  participant?: {
    full_name?: string;
    email?: string;
    whatsapp?: string;
    nim?: string;
    faculty?: string;
    study_program?: string;
    instagram_username?: string;
  };
  ticket_type?: { name?: string };
}

interface ReviewApiResponse {
  success?: boolean;
  message?: string;
  order?: {
    id?: string;
    order_code?: string;
    status?: string;
    total_amount?: number;
    created_at?: string;
    source?: string;
  };
  payments?: Array<{ proof_url?: string | null; rejection_reason?: string }>;
  order_items?: ReviewOrderItem[];
}

const INITIAL_STATS: DashboardStats = {
  totalRevenue: 0,
  totalOrders: 0,
  pendingVerification: 0,
  pendingTickets: 0,
  issuedOrders: 0,
  issuedTicketOrders: 0,
  newOrders: 0,
  multiPaxOrders: [],
  revenueBreakdown: { issued: [], pending: [], discounts: [], totalDiscount: 0 },
};

const NEW_ORDERS_STATUS = "DRAFT,PENDING_PAYMENT";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatRemaining(deadline: number, now: number): string {
  const diff = deadline - now;
  if (diff <= 0) return "Kadaluarsa";
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function statusDot(status: string) {
  switch (status) {
    case "APPROVED":
      return { cls: "bg-emerald-500", label: "Disetujui" };
    case "TICKET_ISSUED":
      return { cls: "bg-emerald-500", label: "Tiket Terbit" };
    case "WAITING_VERIFICATION":
      return { cls: "bg-orange-500", label: "Perlu Verifikasi" };
    case "PENDING_PAYMENT":
    case "DRAFT":
      return { cls: "bg-gold-500", label: "Menunggu Pembayaran" };
    case "REJECTED":
      return { cls: "bg-burgundy-600", label: "Ditolak" };
    default:
      return { cls: "bg-navy-700", label: status };
  }
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconClass,
  note,
  href,
  onAction,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  iconClass: string;
  note: string;
  href?: string;
  onAction?: () => void;
}) {
  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
          {title}
        </span>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9",
            iconClass
          )}
        >
          <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-navy-900 sm:text-[26px]">
        {value}
      </p>
      <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-70" />
        <span>{note}</span>
      </div>
      {href && !onAction && (
        <Link
          href={href}
          className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gold-600 hover:text-gold-500 hover:underline"
        >
          Lihat Detail
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex items-center gap-1 self-start text-[10px] font-bold uppercase tracking-wide text-gold-600 hover:text-gold-500 hover:underline cursor-pointer"
        >
          Lihat Detail
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  icon: Icon,
  iconClass,
  count,
  href,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconClass: string;
  count: number;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 sm:rounded-xl",
              iconClass
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
          <h4 className="truncate text-[10px] font-bold uppercase tracking-wider text-navy-900 sm:text-xs">
            {title}
          </h4>
        </div>
        <span className="flex-shrink-0 rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-bold text-gold-400">
          {count}
        </span>
      </div>

      <div className="flex-1 pt-2.5">{children}</div>

      {href && (
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gold-600 hover:text-gold-500 hover:underline"
        >
          Lihat Semua
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function OrderRow({
  order,
  statusLabel,
  statusClass,
  deadline,
  now,
  onReview,
  onQuickApprove,
}: {
  order: DashboardOrder;
  statusLabel?: string;
  statusClass?: string;
  deadline?: number;
  now?: number;
  onReview?: (order: DashboardOrder) => void;
  onQuickApprove?: (order: DashboardOrder) => void;
}) {
  const name = order.participants?.[0]?.full_name || "Peserta";
  const dot = statusDot(order.status);
  const remaining =
    typeof deadline === "number" && typeof now === "number" ? deadline - now : null;
  return (
    <div className="flex items-center gap-1.5 py-1.5">
      <button
        type="button"
        onClick={() => onReview?.(order)}
        disabled={!onReview}
        className={cn(
          "flex min-w-0 flex-1 flex-col rounded-lg px-1.5 py-1 text-left transition-colors",
          onReview && "hover:bg-secondary/40"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-mono text-[10px] font-bold text-gold-600 sm:text-[11px]">
              {order.order_code}
            </span>
            <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", dot.cls)} />
          </div>
          <span className="flex-shrink-0 text-[11px] font-bold text-navy-900 tabular-nums sm:text-xs">
            {formatRupiah(Number(order.total_amount || 0))}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-semibold text-navy-900">{name}</p>
          <span className="hidden flex-shrink-0 text-[10px] text-muted-foreground sm:block">
            {formatTime(order.created_at)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {statusLabel && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                statusClass
              )}
            >
              {statusLabel}
            </span>
          )}
          {remaining !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums",
                remaining <= 0
                  ? "bg-burgundy-600/10 text-burgundy-600"
                  : remaining < 60000
                    ? "bg-destructive/10 text-destructive"
                    : remaining < 3600000
                      ? "bg-orange-500/15 text-orange-700"
                      : "bg-emerald-500/10 text-emerald-700"
              )}
            >
              <Clock className="h-2.5 w-2.5" />
              Sisa {formatRemaining(deadline as number, now as number)}
            </span>
          )}
        </div>
      </button>
      {onQuickApprove && (
        <button
          type="button"
          onClick={() => onQuickApprove(order)}
          title="Setujui sekarang"
          aria-label={`Setujui pesanan ${order.order_code}`}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SummaryListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-2/3 animate-pulse rounded bg-secondary/60" />
          <div className="h-2.5 w-full animate-pulse rounded bg-secondary/40" />
        </div>
      ))}
    </div>
  );
}

function QuickAction({
  href,
  eyebrow,
  title,
  description,
  icon: Icon,
  bgClass,
  eyebrowClass,
  iconClass,
  arrowClass,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ElementType;
  bgClass: string;
  eyebrowClass: string;
  iconClass: string;
  arrowClass: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl p-5 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl",
        bgClass
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative min-w-0">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest sm:text-xs",
            eyebrowClass
          )}
        >
          {eyebrow}
        </span>
        <p className="font-display text-base font-bold sm:text-lg">{title}</p>
        <p
          className={cn(
            "mt-0.5 text-[11px] font-medium opacity-80 sm:text-xs",
            eyebrowClass
          )}
        >
          {description}
        </p>
      </div>
      <span
        className={cn(
          "relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
          iconClass
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <ArrowRight
        className={cn(
          "absolute bottom-3 right-3 h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100",
          arrowClass
        )}
      />
    </Link>
  );
}

function BreakdownTable({ rows }: { rows: RevenueBreakdownRow[] }) {
  if (rows.length === 0) {
    return <p className="py-3 text-center text-xs text-muted-foreground">Tidak ada data.</p>;
  }
  const subtotal = rows.reduce((sum, row) => sum + row.total, 0);
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <th className="py-2">Jenis Tiket</th>
          <th className="py-2 text-right">Harga</th>
          <th className="py-2 text-right">Jumlah</th>
          <th className="py-2 text-right">Subtotal</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {rows.map((row) => (
          <tr key={`${row.ticket_name}-${row.price}`}>
            <td className="py-2 font-bold text-navy-900">{row.ticket_name}</td>
            <td className="py-2 text-right font-semibold">{formatRupiah(row.price)}</td>
            <td className="py-2 text-right">{row.count} tiket</td>
            <td className="py-2 text-right font-bold text-navy-900">{formatRupiah(row.total)}</td>
          </tr>
        ))}
        <tr className="border-t border-border">
          <td colSpan={3} className="py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Subtotal
          </td>
          <td className="py-2 text-right font-bold text-navy-900">{formatRupiah(subtotal)}</td>
        </tr>
      </tbody>
    </table>
  );
}

interface DiscountTableProps {
  rows: RevenueDiscountRow[];
  referralSummary?: SummaryReferral[];
}

function DiscountTable({ rows, referralSummary = [] }: DiscountTableProps) {
  if (rows.length === 0) {
    return <p className="py-3 text-center text-xs text-muted-foreground">Tidak ada data.</p>;
  }

  const grouped = rows.reduce<Record<string, { discountPerUse: number; count: number; subtotal: number }>>((acc, row) => {
    if (!acc[row.code]) {
      acc[row.code] = { discountPerUse: row.discount, count: 0, subtotal: 0 };
    }
    acc[row.code].count += 1;
    acc[row.code].subtotal += row.discount;
    return acc;
  }, {});

  const referralMap = new Map(referralSummary.map((r) => [r.code, r.usedCount]));

  const totalSubtotal = Object.values(grouped).reduce((sum, g) => sum + g.subtotal, 0);

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
          <th className="py-2">Nama Referal</th>
          <th className="py-2 text-center">Besar Potongan Diskon</th>
          <th className="py-2 text-center">Uda Kepake Berapa</th>
          <th className="py-2 text-right">Sub Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {Object.entries(grouped).map(([code, data]) => {
          const usedCount = referralMap.get(code) ?? data.count;
          return (
            <tr key={code}>
              <td className="py-2 font-mono font-bold text-navy-900">{code}</td>
              <td className="py-2 text-center text-burgundy-600">−{formatRupiah(data.discountPerUse)}</td>
              <td className="py-2 text-center font-bold text-navy-900">{usedCount}</td>
              <td className="py-2 text-right font-bold text-burgundy-600">−{formatRupiah(data.subtotal)}</td>
            </tr>
          );
        })}
        <tr className="border-t border-border">
          <td colSpan={3} className="py-2 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Total Potongan
          </td>
          <td className="py-2 text-right font-bold text-burgundy-600">−{formatRupiah(totalSubtotal)}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function AdminDashboardPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [newOrdersList, setNewOrdersList] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);

  // Review / approve langsung dari dashboard
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewDetail | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [multiPaxOpen, setMultiPaxOpen] = useState(false);
  const [pendingPaxOpen, setPendingPaxOpen] = useState(false);
  const [totalPaxOpen, setTotalPaxOpen] = useState(false);
  const [revenueDetailOpen, setRevenueDetailOpen] = useState(false);
  const [revenueVisible, setRevenueVisible] = useState(false);

  useEffect(() => {
    const hasActiveDraft = newOrdersList.some(
      (o) => o.status === "DRAFT" || o.status === "PENDING_PAYMENT"
    );
    if (!hasActiveDraft) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [newOrdersList]);

  const copyReferralCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Kode referal "${code}" berhasil disalin.`);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1500);
    } catch {
      toast.error("Gagal menyalin kode referal.");
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, summaryRes, ordersRes, newOrdersRes] = await Promise.all([
        fetch("/api/admin/dashboard/stats"),
        fetch("/api/admin/dashboard/summary"),
        fetch("/api/admin/orders?page=1&limit=50"),
        fetch(`/api/admin/orders?status=${NEW_ORDERS_STATUS}&page=1&limit=6`),
      ]);
      const [statsJson, summaryJson, ordersJson, newOrdersJson] = await Promise.all([
        statsRes.json(),
        summaryRes.json(),
        ordersRes.json(),
        newOrdersRes.json(),
      ]);
      if (statsRes.ok && statsJson.data) {
        setStats({ ...INITIAL_STATS, ...statsJson.data });
      }
      if (summaryRes.ok && summaryJson.data) {
        setSummary(summaryJson.data);
      }
      if (ordersRes.ok && ordersJson.items) {
        setOrders(ordersJson.items || []);
      }
      if (newOrdersRes.ok && newOrdersJson.items) {
        setNewOrdersList(newOrdersJson.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const refresh = () => {
      void fetchDashboardData().catch((error) => console.error(error));
    };
    queueMicrotask(refresh);
  }, []);

  // Auto-refresh berkala agar angka dashboard selalu terkini tanpa perlu
  // me-refresh halaman (card, ringkasan, dan tabel).
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchDashboardData().catch((error) => console.error(error));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const pendingApprovalOrders = orders
    .filter((o) => o.status === "WAITING_VERIFICATION")
    .slice(0, 5);

  const isSuperAdmin = summary?.role === "SUPER_ADMIN";
  const activeTickets = summary?.activeTickets;
  const activeReferrals = summary?.activeReferrals;

  const openReview = async (order: DashboardOrder) => {
    setReviewLoading(true);
    setSelectedReview(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { cache: "no-store" });
      const json = (await res.json()) as ReviewApiResponse;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat detail pesanan.");
      }
      const orderItems = json.order_items || [];
      const participants: ReviewParticipant[] = orderItems.map((oi) => ({
        fullName: oi.participant?.full_name ?? "-",
        email: oi.participant?.email ?? "-",
        whatsapp: oi.participant?.whatsapp ?? "-",
        nim: oi.participant?.nim ?? "-",
        faculty: oi.participant?.faculty ?? "-",
        studyProgram: oi.participant?.study_program ?? "-",
        instagram: oi.participant?.instagram_username ?? "",
        ticketName: oi.ticket_type?.name ?? "-",
      }));
      const payments = json.payments || [];
      setSelectedReview({
        id: json.order?.id ?? order.id,
        orderCode: json.order?.order_code ?? order.order_code,
        status: json.order?.status ?? order.status,
        totalAmount: json.order?.total_amount ?? order.total_amount,
        createdAt: json.order?.created_at ?? order.created_at,
        source: json.order?.source ?? "",
        participants,
        paymentProofUrl: payments[0]?.proof_url || null,
        rejectionReason: payments[0]?.rejection_reason || "",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat detail pesanan.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Gagal menyetujui pesanan.");
        return;
      }
      toast.success("Pesanan berhasil disetujui!");
      setSelectedReview(null);
      setRejectModalOpen(false);
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!rejectReason.trim()) {
      toast.error("Alasan penolakan wajib diisi.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || "Gagal menolak pesanan.");
        return;
      }
      toast.success("Pesanan berhasil ditolak.");
      setRejectModalOpen(false);
      setSelectedReview(null);
      setRejectReason("");
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickApprove = async (order: DashboardOrder) => {
    if (!window.confirm(`Setujui pembayaran untuk ${order.order_code}?`)) return;
    await handleApprove(order.id);
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Greeting Header */}
      {/* <div className="flex flex-col gap-4 bg-white p-5 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 mb-2 border border-gold-500/20">
            <span>✦ Panel Operasional Event</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-navy-900">
            Ringkasan Dashboard Panitia
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
            Pantau statistik penjualan tiket, status transaksi terbaru, dan akses cepat ke fitur manajemen panitia.
          </p>
        </div>
      </div> */}

      {/* ── Statistik Utama (5 kartu) ───────────────────────────────────
          Mobile : revenue full-width di atas, lalu grid 2x2.
          Desktop: 5 kartu dalam satu baris. */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Revenue — hero card */}
        <div className="group relative col-span-2 lg:col-span-1 overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-4 sm:p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-gold-500/15 blur-2xl"
          />
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-400 sm:text-xs">
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Total Revenue
          </span>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="font-display text-2xl font-bold text-gold-300 sm:text-[26px]">
              {loading ? "..." : (revenueVisible ? formatRupiah(stats.totalRevenue) : "Rp —")}
            </p>
            <span
              title={revenueVisible ? "Sembunyikan total revenue" : "Tampilkan total revenue"}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400 sm:h-9 sm:w-9 cursor-pointer"
              onClick={() => setRevenueVisible((v) => !v)}
            >
              {revenueVisible ? (
                <EyeOff className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              ) : (
                <Eye className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              )}
            </span>
          </div>
          <div className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-ivory-200/60">
            <Info className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-70" />
            <span>
              {loading ? "..." : `${stats.issuedOrders} tiket terbit + ${stats.pendingTickets} tiket belum di-approve`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRevenueDetailOpen(true)}
            className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gold-400 opacity-80 group-hover:opacity-100 cursor-pointer"
          >
            Lihat Detail
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <StatCard
          title="Total Pesanan"
          value={loading ? "..." : stats.totalOrders}
          icon={ShoppingCart}
          iconClass="bg-navy-900/10 text-navy-900"
          note={loading ? "..." : `${stats.issuedTicketOrders} order terbit + ${stats.pendingVerification} order belum di-approve${stats.multiPaxOrders.length ? ` · ${stats.multiPaxOrders.length} order beli >1 pax` : ""}`}
          onAction={stats.multiPaxOrders.length > 0 ? () => setMultiPaxOpen(true) : undefined}
        />
        <StatCard
          title="Pending Verifikasi"
          value={loading ? "..." : stats.pendingVerification}
          icon={Clock}
          iconClass="bg-orange-500/10 text-orange-600"
          note={stats.multiPaxOrders.length > 0 ? `${stats.pendingVerification} order perlu verifikasi · ${stats.multiPaxOrders.length} order beli >1 pax` : "Tiket menunggu verifikasi admin"}
          onAction={stats.multiPaxOrders.length > 0 ? () => setPendingPaxOpen(true) : undefined}
        />
        <StatCard
          title="Tiket Telah Terbit"
          value={loading ? "..." : stats.issuedOrders}
          icon={Ticket}
          iconClass="bg-emerald-500/10 text-emerald-600"
          note={
            stats.multiPaxOrders.length > 0
              ? `${stats.issuedOrders} tiket dari ${stats.issuedTicketOrders} order (${stats.multiPaxOrders.length} order beli >1 pax)`
              : "Dihitung per tiket yang telah terbit"
          }
          href={stats.multiPaxOrders.length > 0 ? undefined : "/admin/orders?status=TICKET_ISSUED"}
          onAction={stats.multiPaxOrders.length > 0 ? () => setTotalPaxOpen(true) : undefined}
        />
        <StatCard
          title="Pesanan Baru"
          value={loading ? "..." : stats.newOrders}
          icon={Inbox}
          iconClass="bg-gold-500/10 text-gold-600"
          note="Pesanan belum upload bukti pembayaran"
          href={`/admin/orders?status=${NEW_ORDERS_STATUS}`}
        />
      </div>

      {/* ── Quick Action Navigation ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <QuickAction
          href="/admin/orders"
          eyebrow="Verifikasi Order"
          title="Kelola & Setujui Pesanan"
          description="Tinjau bukti pembayaran dan proses pesanan"
          icon={ClipboardCheck}
          bgClass="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white"
          eyebrowClass="text-gold-400"
          iconClass="bg-gold-500/15 text-gold-400"
          arrowClass="text-gold-400"
        />
        <QuickAction
          href="/admin/check-in"
          eyebrow="Scanner Check-In"
          title="Scan QR Masuk Venue"
          description="Validasi tiket peserta di pintu masuk"
          icon={ScanLine}
          bgClass="bg-gradient-to-br from-gold-400 via-gold-500 to-[#B98A2F] text-navy-950"
          eyebrowClass="text-navy-950"
          iconClass="bg-navy-950/10 text-navy-950"
          arrowClass="text-navy-950"
        />
        <QuickAction
          href="/admin/walk-in"
          eyebrow="Kasir Onsite"
          title="Pendaftaran Walk-In"
          description="daftarkan pembeli langsung tanpa harus approve"
          icon={Store}
          bgClass="bg-gradient-to-br from-[#E87932] via-[#D8612A] to-burgundy-600 text-white"
          eyebrowClass="text-white"
          iconClass="bg-white/15 text-white"
          arrowClass="text-white"
        />
      </div>

      {/* ── Ringkasan Cepat ─────────────────────────────────────────────
          Tata letak 2x2. */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/40" />
          <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-[0.15em] text-navy-900">
            Ringkasan Cepat
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/40" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Tiket Aktif */}
          <SummaryCard
            title="Tiket Aktif"
            icon={Ticket}
            iconClass="bg-gold-500/10 text-gold-600"
            count={activeTickets?.total ?? 0}
            href={isSuperAdmin ? "/admin/tickets" : undefined}
          >
            {loading ? (
              <SummaryListSkeleton rows={2} />
            ) : (activeTickets?.items ?? []).length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Belum ada tiket aktif.
              </p>
            ) : (
              <div className="space-y-2">
                {(activeTickets?.items ?? []).slice(0, 3).map((t) => {
                  const quota = Number(t.quota || 0);
                  const used = Number(t.issued || 0) + Number(t.pending || 0);
                  const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
                  return (
                    <div key={t.id} className="rounded-xl border border-border bg-secondary/20 p-2 sm:p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-navy-900 sm:text-xs">{t.name}</p>
                          <p className="truncate font-mono text-[9px] text-muted-foreground">
                            {t.code} · {formatRupiah(Number(t.finalPrice || 0))}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                            {t.issued} terbit
                          </span>
                          <span className="rounded-full bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-700">
                            {t.pending} pending
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold-500 to-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>Kuota terpakai</span>
                        <span className="font-bold tabular-nums">
                          {used}/{quota} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
                <p className="flex items-start gap-1 pt-0.5 text-[9px] leading-snug text-muted-foreground sm:text-[10px]">
                  <Info className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-70" />
                  <span>Kuota terpakai = tiket terbit + tiket belum di-approve (pending).</span>
                </p>
              </div>
            )}
          </SummaryCard>

          {/* Kode Referal Aktif — super admin saja */}
          {isSuperAdmin && (
            <SummaryCard
              title="Kode Referal Aktif"
              icon={Tag}
              iconClass="bg-navy-900/10 text-navy-900"
              count={activeReferrals?.total ?? 0}
              href="/admin/referrals"
            >
              {loading ? (
                <SummaryListSkeleton rows={2} />
              ) : (activeReferrals?.items ?? []).length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Belum ada kode referal aktif.
                </p>
              ) : (
                <div className="space-y-2">
                  {(activeReferrals?.items ?? []).slice(0, 3).map((r) => {
                      const limit = r.usageLimit;
                      const pct = limit ? Math.min(100, Math.round((r.usedCount / limit) * 100)) : 0;
                      const derivedStatus = getDerivedReferralStatus(r as any);
                      const statusConfig = {
                        ACTIVE: { label: "Aktif", cls: "bg-emerald-500/15 text-emerald-700", icon: CheckCircle2 },
                        UPCOMING: { label: "Akan Datang", cls: "bg-gold-500/15 text-gold-700", icon: Clock },
                        EXPIRED: { label: "Kadaluarsa", cls: "bg-gray-200 text-gray-700", icon: XCircle },
                        EXHAUSTED: { label: "Habis", cls: "bg-destructive/15 text-destructive", icon: AlertCircle },
                        INACTIVE: { label: "Nonaktif", cls: "bg-amber-500/15 text-amber-800", icon: PauseCircle },
                        DRAFT: { label: "Draft", cls: "bg-navy-900/10 text-navy-900", icon: FileText },
                        ARCHIVED: { label: "Arsip", cls: "bg-gray-100 text-gray-500", icon: Archive },
                      };
                      const sc = statusConfig[derivedStatus as keyof typeof statusConfig] || statusConfig.ACTIVE;
                      const StatusIcon = sc.icon;
                      return (
                        <div key={r.id} className="rounded-xl border border-border bg-secondary/20 p-2 sm:p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-[11px] font-bold text-gold-600 sm:text-xs">
                                {r.code}
                              </p>
                              <p className="truncate text-[9px] text-muted-foreground">
                                {r.discountType === "PERCENTAGE"
                                  ? `${r.discountValue}% diskon`
                                  : `${formatRupiah(r.discountValue)} diskon`}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                sc.cls
                              )}
                            >
                              <StatusIcon className="h-2.5 w-2.5" />
                              {sc.label}
                            </span>
                            <button
                            type="button"
                            onClick={() => copyReferralCode(r.code)}
                            title="Salin kode referal"
                            aria-label={`Salin kode ${r.code}`}
                            className={cn(
                              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
                              copiedCode === r.code
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-navy-900/10 text-navy-900 hover:bg-gold-500 hover:text-navy-950"
                            )}
                          >
                            {copiedCode === r.code ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-navy-800 to-gold-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "flex-shrink-0 text-[9px] font-bold tabular-nums",
                              limit && r.usedCount >= limit
                                ? "text-burgundy-600"
                                : "text-emerald-700"
                            )}
                          >
                            {r.usedCount}
                            {limit ? `/${limit}` : ""} pakai
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SummaryCard>
          )}

          {/* Order Baru Masuk */}
          <SummaryCard
            title="Order Baru Masuk"
            icon={PackagePlus}
            iconClass="bg-gold-500/10 text-gold-600"
            count={stats.newOrders}
            href={`/admin/orders?status=${NEW_ORDERS_STATUS}`}
          >
            {loading ? (
              <SummaryListSkeleton rows={3} />
            ) : newOrdersList.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Belum ada pesanan baru.
              </p>
            ) : (
              <div className="divide-y divide-border/70">
                {newOrdersList.map((o) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    statusLabel="Menunggu Pembayaran"
                    statusClass="bg-gold-500/15 text-gold-700"
                    deadline={new Date(o.created_at).getTime() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000}
                    now={now}
                  />
                ))}
                <p className="flex items-start gap-1 pt-1 text-[9px] leading-snug text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-70" />
                  <span>
                    Belum ada bukti pembayaran yang diunggah. Hitung mundur = batas upload
                    bukti, otomatis kadaluarsa setelah {PAYMENT_WINDOW_HOURS} jam.
                  </span>
                </p>
              </div>
            )}
          </SummaryCard>

          {/* Orderan Perlu Approve */}
          <SummaryCard
            title="Perlu Approve"
            icon={ShieldCheck}
            iconClass="bg-orange-500/10 text-orange-600"
            count={pendingApprovalOrders.length}
            href="/admin/orders?status=WAITING_VERIFICATION"
          >
            {loading ? (
              <SummaryListSkeleton rows={3} />
            ) : pendingApprovalOrders.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Tidak ada pesanan menunggu verifikasi.
              </p>
            ) : (
              <div className="divide-y divide-border/70">
                {pendingApprovalOrders.map((o) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    statusLabel="Perlu Verifikasi"
                    statusClass="bg-orange-500/15 text-orange-700"
                    onReview={openReview}
                    onQuickApprove={handleQuickApprove}
                  />
                ))}
                <p className="flex items-start gap-1 pt-1 text-[9px] leading-snug text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 flex-shrink-0 opacity-70" />
                  <span>Klik pesanan untuk review &amp; approve langsung.</span>
                </p>
              </div>
            )}
          </SummaryCard>
        </div>
      </section>

      {/* ── Review & Approve Modal ────────────────────────────────────── */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-white p-5 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  VERIFIKASI & DETAIL PESANAN
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-navy-900">
                  {selectedReview.orderCode}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {formatTime(selectedReview.createdAt)}
                  {selectedReview.source ? ` · ${selectedReview.source}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {reviewLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold-500" />
                <p className="mt-2 text-xs text-muted-foreground">Memuat detail pesanan...</p>
              </div>
            ) : (
              <>
                {/* Order Summary */}
                <div className="rounded-2xl bg-secondary/30 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-muted-foreground font-semibold uppercase text-[10px]">
                      Total Tagihan
                    </span>
                    <span className="text-gold-600 font-bold">
                      {formatRupiah(selectedReview.totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground font-semibold uppercase text-[10px]">
                      Jumlah Pemesan
                    </span>
                    <span className="text-navy-900 font-semibold">
                      {selectedReview.participants.length}
                    </span>
                  </div>
                </div>

                {/* Participants */}
                {selectedReview.participants.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase text-navy-900">
                      Daftar Pemesan ({selectedReview.participants.length})
                    </span>
                    <div className="space-y-2">
                      {selectedReview.participants.map((p, i) => (
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

                {/* Payment Proof */}
                {selectedReview.paymentProofUrl && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-navy-900">
                      Foto Bukti Transfer
                    </span>
                    <div className="relative aspect-[16/9] max-h-60 w-full rounded-2xl overflow-hidden border border-border bg-black">
                      <Image
                        src={selectedReview.paymentProofUrl}
                        alt="Bukti Transfer"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
                {!selectedReview.paymentProofUrl && selectedReview.status === "WAITING_VERIFICATION" && (
                  <div className="rounded-2xl bg-orange-500/10 p-3 text-xs font-semibold text-orange-700">
                    Belum ada bukti pembayaran yang terunggah.
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  {selectedReview.status === "WAITING_VERIFICATION" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRejectModalOpen(true)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-destructive/10 px-5 py-3 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Tolak Pembayaran</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(selectedReview.id)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        <span>Setujui (Approve)</span>
                      </button>
                    </>
                  )}

                  {(selectedReview.status === "APPROVED" || selectedReview.status === "TICKET_ISSUED") && (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-500/15 px-4 py-2 rounded-xl">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {selectedReview.status === "TICKET_ISSUED"
                          ? "Tiket Telah Diterbitkan"
                          : "Pesanan Telah Disetujui"}
                      </span>
                    </div>
                  )}

                  {selectedReview.status === "REJECTED" && (
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedReview.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Ubah ke Disetujui (Approve)</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ───────────────────────────────────────── */}
      {rejectModalOpen && selectedReview && (
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
                onClick={() => handleReject(selectedReview.id)}
                disabled={busy}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-white hover:bg-destructive/90 shadow-md disabled:opacity-50"
              >
                {busy ? "Memproses..." : "Konfirmasi Tolak"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Order Multi Pax (beli >1 tiket dalam 1 order) ───────── */}
{/* ── Modal Order Multi Pax - Tiket Terbit (only TICKET_ISSUED) ───────── */}
      {totalPaxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-5 sm:px-7 py-4">
              <div>

                <h3 className="font-display text-lg sm:text-xl font-bold text-navy-900">
                  Detail Order Multi Pax (Tiket Terbit)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTotalPaxOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {(() => {
                const totalPaxIssued = stats.multiPaxOrders.filter(
                  (order) => order.status === "TICKET_ISSUED"
                );
                return (
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                      {totalPaxIssued.length === 0 ? 'Tidak ada order multi pax terbit' : `Detail Order Multi Pax (${totalPaxIssued.length} order terbit)`}
                    </h4>
                    {totalPaxIssued.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Tidak ada order multi pax.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {totalPaxIssued.map((order) => (
                          <div key={order.order_id} className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-sm font-bold text-navy-900 truncate">{order.order_code}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {order.created_at ? formatTime(order.created_at) : "-"}
                                </p>
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-1.5">

                                <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-[10px] font-bold text-gold-700">
                                  {order.ticketCount} pax
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {order.items
                                .filter((item) => item.ticket_code)
                                .map((item, i) => (
                                  <div
                                    key={`${item.ticket_code ?? "ticket"}-${i}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-navy-900">{item.full_name}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {item.nim} · {item.faculty}
                                      </p>
                                    </div>
                                    <div className="sm:text-right space-y-1">
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                          item.ticket_type === "FREE"
                                            ? "bg-emerald-500/15 text-emerald-700"
                                            : "bg-gold-500/20 text-gold-700"
                                        )}
                                      >
                                        {item.ticket_name}
                                      </span>
                                      <p className="font-mono text-[10px] font-bold text-gold-700">{item.ticket_code}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {item.email}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Order Multi Pax - Pending Verifikasi (only WAITING_VERIFICATION) ───────── */}
      {pendingPaxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-5 sm:px-7 py-4">
              <div>

                <h3 className="font-display text-lg sm:text-xl font-bold text-navy-900">
                  Detail Order Multi Pax (Perlu Verifikasi)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingPaxOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {(() => {
                const pendingPaxOrders = stats.multiPaxOrders.filter(
                  (order) => order.status === "WAITING_VERIFICATION"
                );
                return (
                  <section className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                      {pendingPaxOrders.length === 0 ? 'Tidak ada order multi pax perlu verifikasi' : `Detail Order Multi Pax (${pendingPaxOrders.length} order perlu verifikasi)`}
                    </h4>
                    {pendingPaxOrders.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Tidak ada order multi pax.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {pendingPaxOrders.map((order) => (
                          <div key={order.order_id} className="rounded-2xl border border-border bg-secondary/20 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-mono text-sm font-bold text-navy-900 truncate">{order.order_code}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {order.created_at ? formatTime(order.created_at) : "-"}
                                </p>
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-1.5">

                                <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[10px] font-bold text-orange-600">
                                  {order.ticketCount} pax
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {order.items.map((item, i) => (
                                <div
                                  key={`${item.ticket_code ?? `ticket-${i}`}-${i}`}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-navy-900">{item.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {item.nim} · {item.faculty}
                                    </p>
                                  </div>
                                  <div className="sm:text-right space-y-1">
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                        item.ticket_type === "FREE"
                                          ? "bg-emerald-500/15 text-emerald-700"
                                          : "bg-gold-500/20 text-gold-700"
                                      )}
                                    >
                                      {item.ticket_name}
                                    </span>
                                    <p className="font-mono text-[10px] font-bold text-orange-600">
                                      {item.ticket_code ? item.ticket_code : 'Belum terbit'}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {item.email}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })()}
            </div>
          </div>
        </div>
      )}

{/* ── Modal Order Multi Pax - Combined (both TICKET_ISSUED + WAITING_VERIFICATION) ───────── */}
      {multiPaxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-5 sm:px-7 py-4">
              <div>

                <h3 className="font-display text-lg sm:text-xl font-bold text-navy-900">
                  Detail Order Multi Pax
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {stats.multiPaxOrders.filter(o => o.status === "TICKET_ISSUED").length} terbit + {stats.multiPaxOrders.filter(o => o.status === "WAITING_VERIFICATION").length} perlu verifikasi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMultiPaxOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {(() => {
                const multiPaxIssued = stats.multiPaxOrders.filter(
                  (order) => order.status === "TICKET_ISSUED"
                );
                const multiPaxPending = stats.multiPaxOrders.filter(
                  (order) => order.status === "WAITING_VERIFICATION"
                );
                return (
                  <div className="space-y-6">
                    {/* Tiket Terbit Section */}
                    {multiPaxIssued.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            Tiket Terbit ({multiPaxIssued.length} order)
                          </span>
                          <div className="h-px flex-1 bg-emerald-500/20" />
                        </div>
                        <div className="space-y-3">
                          {multiPaxIssued.map((order) => (
                            <div key={order.order_id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-mono text-sm font-bold text-navy-900 truncate">{order.order_code}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {order.created_at ? formatTime(order.created_at) : "-"}
                                  </p>
                                </div>
                                <div className="flex flex-shrink-0 items-center gap-1.5">
                                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                    {order.ticketCount} pax
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {order.items.map((item, i) => (
                                  <div
                                    key={`${item.ticket_code ?? `ticket-${i}`}-${i}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-500/10 bg-white px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-navy-900">{item.full_name}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {item.nim} · {item.faculty}
                                      </p>
                                    </div>
                                    <div className="sm:text-right space-y-1">
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                          item.ticket_type === "FREE"
                                            ? "bg-emerald-500/15 text-emerald-700"
                                            : "bg-gold-500/20 text-gold-700"
                                        )}
                                      >
                                        {item.ticket_name}
                                      </span>
                                      <p className="font-mono text-[10px] font-bold text-emerald-700">
                                        {item.ticket_code ? item.ticket_code : 'Belum terbit'}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {item.email}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Perlu Verifikasi Section */}
                    {multiPaxPending.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[10px] font-bold text-orange-600">
                            Perlu Verifikasi ({multiPaxPending.length} order)
                          </span>
                          <div className="h-px flex-1 bg-orange-500/20" />
                        </div>
                        <div className="space-y-3">
                          {multiPaxPending.map((order) => (
                            <div key={order.order_id} className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-mono text-sm font-bold text-navy-900 truncate">{order.order_code}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {order.created_at ? formatTime(order.created_at) : "-"}
                                  </p>
                                </div>
                                <div className="flex flex-shrink-0 items-center gap-1.5">
                                  <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-[10px] font-bold text-orange-600">
                                    {order.ticketCount} pax
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {order.items.map((item, i) => (
                                  <div
                                    key={`${item.ticket_code ?? `ticket-${i}`}-${i}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-orange-500/10 bg-white px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-navy-900">{item.full_name}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {item.nim} · {item.faculty}
                                      </p>
                                    </div>
                                    <div className="sm:text-right space-y-1">
                                      <span
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                          item.ticket_type === "FREE"
                                            ? "bg-emerald-500/15 text-emerald-700"
                                            : "bg-gold-500/20 text-gold-700"
                                        )}
                                      >
                                        {item.ticket_name}
                                      </span>
                                      <p className="font-mono text-[10px] font-bold text-orange-600">
                                        {item.ticket_code ? item.ticket_code : 'Belum terbit'}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {item.email}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {multiPaxIssued.length === 0 && multiPaxPending.length === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        Tidak ada order multi pax.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Rincian Revenue ─────────────────────────────────────── */}
      {revenueDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-5 sm:px-7 py-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  RINCIAN REVENUE
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold text-navy-900">
                  Total {formatRupiah(stats.totalRevenue)}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {stats.issuedOrders} tiket terbit · {stats.pendingTickets} tiket belum di-approve
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevenueDetailOpen(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-7 space-y-6">
              {(() => {
                const issuedSubtotal = stats.revenueBreakdown.issued.reduce((s, r) => s + r.total, 0);
                const pendingSubtotal = stats.revenueBreakdown.pending.reduce((s, r) => s + r.total, 0);
                const subtotal = issuedSubtotal + pendingSubtotal;
                const totalDiscount = stats.revenueBreakdown.totalDiscount ?? 0;
                return (
                  <div className="space-y-6">
                    <section className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                        Tiket Terbit
                      </h4>
                      <BreakdownTable rows={stats.revenueBreakdown.issued} />
                    </section>

                    <section className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                        Belum di-approve
                      </h4>
                      <BreakdownTable rows={stats.revenueBreakdown.pending} />
                    </section>

                    {stats.revenueBreakdown.discounts.length > 0 && (
                      <section className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900">
                          Diskon Referal
                        </h4>
                        <DiscountTable
                          rows={stats.revenueBreakdown.discounts}
                          referralSummary={summary?.activeReferrals?.items ?? []}
                        />
                      </section>
                    )}

                    <div className="space-y-2 rounded-2xl bg-navy-900 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
                          Subtotal Tiket
                        </span>
                        <span className="text-sm font-bold text-white">
                          {formatRupiah(subtotal)}
                        </span>
                      </div>
                      {totalDiscount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-gold-400/80">
                            Potongan Referal
                          </span>
                          <span className="text-sm font-bold text-red-300">
                            −{formatRupiah(totalDiscount)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-white/10 pt-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gold-400">Total</span>
                        <span className="font-display text-lg font-bold text-gold-300">
                          {formatRupiah(stats.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}