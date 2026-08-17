"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { OrderItem } from "@/lib/order-store";

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ArrowUpDown,
  Building,
  Ticket,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ApiOrder = {
  id: string;
  order_code: string;
  status: string;
  total_amount: number;
  participant_count: number;
  participants: Array<{ full_name: string; email: string; nim: string; faculty: string; study_program: string; whatsapp?: string }>;
  ticket_types: string[];
  created_at: string;
};

function toLegacyOrder(order: ApiOrder): OrderItem & { databaseId: string } {
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
    paymentStatus: order.status.toLowerCase() as "pending" | "approved" | "rejected",
    createdAt: new Date(order.created_at).toLocaleString("id-ID"),
    checkedIn: false,
    checkedInAt: "",
  };
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get("status") || "all";

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusParam);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [facultyFilter, setFacultyFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const refreshOrders = async () => {
    const params = new URLSearchParams({ page: "1", limit: "100" });
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (statusFilter !== "all") params.set("status", statusFilter.toUpperCase());
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
      alert("Pesanan berhasil disetujui!");
      refreshOrders();
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
      statusFilter === "all" || order.paymentStatus === statusFilter;

    const matchesTicket =
      ticketFilter === "all" || order.ticketId === ticketFilter;

    const matchesFaculty =
      facultyFilter === "all" || order.faculty.includes(facultyFilter);

    return matchesSearch && matchesStatus && matchesTicket && matchesFaculty;
  });

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
              id: "pending",
              label: "Pending Verifikasi",
              count: orders.filter((o) => o.paymentStatus === "pending").length,
            },
            {
              id: "approved",
              label: "Disetujui (Approved)",
              count: orders.filter((o) => o.paymentStatus === "approved").length,
            },
            {
              id: "rejected",
              label: "Ditolak (Rejected)",
              count: orders.filter((o) => o.paymentStatus === "rejected").length,
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
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                          order.paymentStatus === "approved" &&
                            "bg-emerald-500/15 text-emerald-700",
                          order.paymentStatus === "pending" &&
                            "bg-orange-500/15 text-orange-700",
                          order.paymentStatus === "rejected" &&
                            "bg-destructive/15 text-destructive"
                        )}
                      >
                        {order.paymentStatus === "approved" && <CheckCircle2 className="h-3 w-3" />}
                        {order.paymentStatus === "pending" && <Clock className="h-3 w-3" />}
                        {order.paymentStatus === "rejected" && <XCircle className="h-3 w-3" />}
                        <span>{order.paymentStatus}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[11px] text-muted-foreground whitespace-nowrap">
                      {order.createdAt}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Review</span>
                        </button>
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

            {/* Profile Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-secondary/30 p-4 rounded-2xl">
              <div>
                <span className="text-muted-foreground block font-semibold uppercase text-[10px]">Nama Lengkap</span>
                <strong className="text-navy-900 text-sm">{selectedOrder.customerName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold uppercase text-[10px]">NIM & Fakultas</span>
                <span className="text-navy-900 font-semibold">{selectedOrder.nim} • {selectedOrder.faculty}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold uppercase text-[10px]">Kontak Peserta</span>
                <span className="text-navy-900 font-semibold">{selectedOrder.whatsapp} • {selectedOrder.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-semibold uppercase text-[10px]">Tiket & Tagihan</span>
                <span className="text-gold-600 font-bold">{selectedOrder.ticketName} ({selectedOrder.quantity} Pax) — Rp {selectedOrder.totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>

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
              {selectedOrder.paymentStatus === "pending" && (
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
                    onClick={() => handleApprove((selectedOrder as OrderItem & { databaseId: string }).databaseId)}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Setujui (Approve)</span>
                  </button>
                </>
              )}

              {selectedOrder.paymentStatus === "approved" && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-500/15 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Pesanan Telah Disetujui</span>
                </div>
              )}

              {selectedOrder.paymentStatus === "rejected" && (
                <button
                  type="button"
                  onClick={() => handleApprove((selectedOrder as OrderItem & { databaseId: string }).databaseId)}
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
                onClick={() => handleReject((selectedOrder as OrderItem & { databaseId: string }).databaseId)}
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-white hover:bg-destructive/90 shadow-md"
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
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
