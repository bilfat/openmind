"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getStoredOrders, updateOrderStatus, OrderItem } from "@/lib/order-store";
import {
  ShoppingCart,
  Clock,
  ScanLine,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  Ticket,
  Eye,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderItem[]>(() => getStoredOrders());
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const refreshOrders = () => {
    setOrders(getStoredOrders());
  };

  const totalOrders = orders.length;
  const ticketsSold = orders
    .filter((o) => o.paymentStatus !== "rejected")
    .reduce((sum, o) => sum + o.quantity, 0);
  const pendingOrders = orders.filter((o) => o.paymentStatus === "pending");
  const checkedInCount = orders.filter((o) => o.checkedIn).length;
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "approved")
    .reduce((sum, o) => sum + o.totalPrice, 0);

  const handleApprove = (orderId: string) => {
    updateOrderStatus(orderId, "approved");
    refreshOrders();
    setSelectedOrder(null);
  };

  const handleReject = (orderId: string) => {
    updateOrderStatus(orderId, "rejected", rejectReason || "Bukti transfer tidak valid");
    refreshOrders();
    setRejectModalOpen(false);
    setSelectedOrder(null);
    setRejectReason("");
  };

  const statusBadge = (status: string) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap",
        status === "approved" && "bg-emerald-500/15 text-emerald-700",
        status === "pending" && "bg-orange-500/15 text-orange-700",
        status === "rejected" && "bg-destructive/15 text-destructive"
      )}
    >
      {status === "approved" && <CheckCircle2 className="h-3 w-3" />}
      {status === "pending" && <Clock className="h-3 w-3" />}
      {status === "rejected" && <XCircle className="h-3 w-3" />}
      <span>{status}</span>
    </span>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ── Top Greeting Header ── */}
      <div className="flex flex-col gap-4 bg-white p-5 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 mb-2 border border-gold-500/20">
            <span>✦ Panel Operasional Event</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-navy-900">
            Ringkasan Dashboard Panitia
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
            Pantau status pesanan tiket, verifikasi pembayaran peserta, dan kehadiran hari H.
          </p>
        </div>

        {/* CTA Buttons — stack on xs, row on sm+ */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link
            href="/admin/check-in"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-navy-900 px-5 py-3 text-xs sm:text-sm font-bold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm"
          >
            <ScanLine className="h-4 w-4" />
            <span>Scanner Check-In</span>
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-5 py-3 text-xs sm:text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Kelola Pesanan</span>
          </Link>
        </div>
      </div>

      {/* ── Pending Alert ── */}
      {pendingOrders.length > 0 && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm flex-shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-orange-950">
                Ada {pendingOrders.length} Pesanan Menunggu Verifikasi
              </h4>
              <p className="text-xs text-orange-900/70">
                Segera periksa bukti transfer agar peserta dapat segera menerima E-Ticket resmi.
              </p>
            </div>
          </div>
          <Link
            href="/admin/orders?status=pending"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-950 underline hover:text-orange-700 whitespace-nowrap self-start sm:self-auto"
          >
            <span>Verifikasi Sekarang</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── 4 Stat Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Orders */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-white p-4 sm:p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              TOTAL PESANAN
            </span>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-navy-900/5 text-navy-900">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-black text-navy-900">
            {totalOrders}
          </p>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-muted-foreground">
            <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
            <span className="font-semibold text-emerald-600">Total Transaksi</span>
            <span className="hidden sm:inline">terekam</span>
          </div>
        </div>

        {/* Tickets Sold */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-white p-4 sm:p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              TIKET TERJUAL
            </span>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-gold-500/10 text-gold-600">
              <Ticket className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-black text-navy-900">
            {ticketsSold} <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Pax</span>
          </p>
          <div className="text-[10px] sm:text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">Omzet Masuk: </span>
            <strong className="font-bold text-navy-900 block sm:inline">Rp {totalRevenue.toLocaleString("id-ID")}</strong>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-white p-4 sm:p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              PENDING
            </span>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-orange-500/10 text-orange-600">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-black text-orange-600">
            {pendingOrders.length}
          </p>
          <div className="text-[10px] sm:text-[11px] text-muted-foreground">
            <span>Butuh konfirmasi</span>
          </div>
        </div>

        {/* Checked In */}
        <div className="rounded-2xl sm:rounded-3xl border border-border bg-white p-4 sm:p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              CHECK-IN
            </span>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-600">
              <ScanLine className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-black text-emerald-600">
            {checkedInCount}
          </p>
          <div className="text-[10px] sm:text-[11px] text-muted-foreground">
            <span>Kehadiran Hari H</span>
          </div>
        </div>
      </div>

      {/* ── Recent Orders Section ── */}
      <div className="rounded-2xl sm:rounded-3xl border border-border bg-white p-4 sm:p-8 shadow-sm space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-navy-900">
              Pesanan Terbaru
            </h3>
            <p className="text-xs text-muted-foreground">
              Daftar transaksi pendaftaran tiket yang baru masuk
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-gold-600 hover:text-gold-500 underline flex items-center gap-1"
          >
            <span>Lihat Semua Pesanan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* ── Desktop Table (md+) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-navy-900 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">Order ID</th>
                <th className="px-4 py-3.5">Peserta</th>
                <th className="px-4 py-3.5">Tiket</th>
                <th className="px-4 py-3.5">Total</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Waktu</th>
                <th className="px-4 py-3.5 text-right rounded-r-xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.orderId} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-4 font-mono font-bold text-navy-900">
                    {order.orderId}
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-navy-900 block">
                      {order.customerName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {order.nim} • {order.faculty}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-gold-600">
                      {order.ticketName}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {order.quantity} Pax
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-navy-900">
                    {order.totalPrice === 0
                      ? "GRATIS"
                      : `Rp ${order.totalPrice.toLocaleString("id-ID")}`}
                  </td>
                  <td className="px-4 py-4">{statusBadge(order.paymentStatus)}</td>
                  <td className="px-4 py-4 text-[11px] text-muted-foreground">
                    {order.createdAt}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1 rounded-xl bg-navy-900 px-3 py-1.5 text-xs font-semibold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Detail</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Mobile Cards (< md) ── */}
        <div className="md:hidden space-y-3">
          {orders.slice(0, 5).map((order) => (
            <div
              key={order.orderId}
              className="rounded-2xl border border-border bg-secondary/10 p-4 space-y-3"
            >
              {/* Top row: name + status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 text-sm truncate">
                    {order.customerName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {order.orderId}
                  </p>
                </div>
                {statusBadge(order.paymentStatus)}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">NIM</span>
                  <span className="font-semibold text-navy-900">{order.nim}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tiket</span>
                  <span className="font-semibold text-gold-600">{order.ticketName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Total</span>
                  <span className="font-semibold text-navy-900">
                    {order.totalPrice === 0
                      ? "GRATIS"
                      : `Rp ${order.totalPrice.toLocaleString("id-ID")}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Waktu</span>
                  <span className="text-navy-900">{order.createdAt}</span>
                </div>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={() => setSelectedOrder(order)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy-900 px-3 py-2.5 text-xs font-semibold text-ivory-100 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Detail</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Order Detail & Verification Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4 backdrop-blur-sm">
          <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-border bg-white p-5 sm:p-8 shadow-2xl space-y-5 sm:space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                  DETAIL ORDER PANITIA
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-navy-900">
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

            {/* Profile Info — 1-col mobile, 2-col sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs bg-secondary/30 p-3 sm:p-4 rounded-2xl">
              <div>
                <span className="text-muted-foreground block">Nama Lengkap</span>
                <strong className="text-navy-900 text-sm">{selectedOrder.customerName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">NIM & Fakultas</span>
                <span className="text-navy-900 font-semibold">{selectedOrder.nim} • {selectedOrder.faculty}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">WhatsApp & Email</span>
                <span className="text-navy-900 font-semibold">{selectedOrder.whatsapp} • {selectedOrder.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Tiket & Total Bayar</span>
                <span className="text-gold-600 font-bold">{selectedOrder.ticketName} ({selectedOrder.quantity} Pax) — Rp {selectedOrder.totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Proof of Payment */}
            {selectedOrder.paymentProofUrl && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-navy-900">
                  Bukti Transfer yang Diunggah Peserta:
                </span>
                <div className="relative aspect-[16/9] max-h-56 w-full rounded-2xl overflow-hidden border border-border bg-black">
                  <Image
                    src={selectedOrder.paymentProofUrl}
                    alt="Bukti Transfer"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons — stack on mobile */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-border">
              {selectedOrder.paymentStatus === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-destructive/10 px-5 py-3 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Tolak Bukti</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(selectedOrder.orderId)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Setujui (Approve)</span>
                  </button>
                </>
              )}

              {selectedOrder.paymentStatus === "approved" && (
                <div className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-500/15 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Pesanan Telah Disetujui</span>
                </div>
              )}

              {selectedOrder.paymentStatus === "rejected" && (
                <button
                  type="button"
                  onClick={() => handleApprove(selectedOrder.orderId)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Ubah ke Disetujui</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ── */}
      {rejectModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 space-y-4 shadow-2xl">
            <h4 className="font-display text-lg font-bold text-navy-900">
              Alasan Penolakan Pembayaran
            </h4>
            <p className="text-xs text-muted-foreground">
              Pilih alasan agar peserta mengetahui perbaikan yang harus dilakukan:
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
                onClick={() => handleReject(selectedOrder.orderId)}
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
