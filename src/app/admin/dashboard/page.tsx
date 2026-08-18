"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Clock,
  ScanLine,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  Ticket,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardOrder {
  id: string;
  order_code: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  ticket_types?: string[];
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  pendingVerification: number;
  approvedOrders: number;
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingVerification: 0,
    approvedOrders: 0,
  });

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch("/api/admin/dashboard/stats"),
        fetch("/api/admin/orders?page=1&limit=50"),
      ]);
      const statsJson = await statsRes.json();
      const ordersJson = await ordersRes.json();
      if (statsRes.ok && statsJson.data) {
        setStats(statsJson.data);
      }
      if (ordersRes.ok && ordersJson.items) {
        setOrders(ordersJson.items || []);
      }
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statusBadge = (status: string) => (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap",
        status === "APPROVED" && "bg-emerald-500/15 text-emerald-700",
        (status === "PENDING" || status === "SUBMITTED") && "bg-orange-500/15 text-orange-700",
        status === "REJECTED" && "bg-destructive/15 text-destructive"
      )}
    >
      {status === "APPROVED" && <CheckCircle2 className="h-3 w-3" />}
      {(status === "PENDING" || status === "SUBMITTED") && <Clock className="h-3 w-3" />}
      {status === "REJECTED" && <XCircle className="h-3 w-3" />}
      <span>{status}</span>
    </span>
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Greeting Header */}
      <div className="flex flex-col gap-4 bg-white p-5 sm:p-8 rounded-3xl border border-border shadow-sm">
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
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-display text-2xl font-bold text-navy-900">
            {loading ? "..." : `Rp ${stats.totalRevenue.toLocaleString("id-ID")}`}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pesanan</span>
            <ShoppingCart className="h-4 w-4 text-navy-900" />
          </div>
          <p className="font-display text-2xl font-bold text-navy-900">
            {loading ? "..." : stats.totalOrders}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Verifikasi</span>
            <Clock className="h-4 w-4 text-orange-600" />
          </div>
          <p className="font-display text-2xl font-bold text-orange-600">
            {loading ? "..." : stats.pendingVerification}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Pesanan Disetujui</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-display text-2xl font-bold text-emerald-600">
            {loading ? "..." : stats.approvedOrders}
          </p>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/orders"
          className="flex items-center justify-between bg-navy-950 text-white p-5 rounded-2xl shadow-md hover:bg-navy-900 transition"
        >
          <div>
            <span className="text-xs text-gold-400 font-bold uppercase">VERIFIKASI ORDER</span>
            <p className="font-display text-base font-bold">Kelola Daftar Pesanan</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gold-400" />
        </Link>

        <Link
          href="/admin/check-in"
          className="flex items-center justify-between bg-gold-500 text-navy-950 p-5 rounded-2xl shadow-md hover:bg-gold-400 transition"
        >
          <div>
            <span className="text-xs font-bold uppercase">GATE VENUE</span>
            <p className="font-display text-base font-bold">Scanner Check-In QR</p>
          </div>
          <ScanLine className="h-5 w-5" />
        </Link>

        <Link
          href="/admin/walk-in"
          className="flex items-center justify-between p-5 rounded-2xl shadow-md transition"
          style={{
            backgroundColor: "#0B1F3A",
            color: "#FFFFFF",
          }}
        >
          <div>
            <span
              className="text-xs font-bold uppercase"
              style={{ color: "#C62828" }}
            >
              KASIR ONSITE
            </span>

            <p
              className="font-display text-base font-bold"
              style={{ color: "#FFFFFF" }}
            >
              Pendaftaran Walk-In
            </p>
          </div>

          <Ticket
            className="h-5 w-5"
            style={{ color: "#C62828" }}
          />
        </Link>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h3 className="font-display text-lg font-bold text-navy-900">Transaksi Terbaru</h3>
          <Link href="/admin/orders" className="text-xs font-bold text-gold-600 hover:underline">
            Lihat Semua Pesanan →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-gold-500 mb-2" />
            <span>Memuat transaksi terbaru...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">Belum ada transaksi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/30 font-bold uppercase text-navy-900 border-b border-border">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Pemesan</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-secondary/10">
                    <td className="p-3 font-mono font-bold text-gold-600">{o.order_code}</td>
                    <td className="p-3 font-bold text-navy-900">{o.customer_name}</td>
                    <td className="p-3">Rp {Number(o.total_amount).toLocaleString("id-ID")}</td>
                    <td className="p-3">{statusBadge(o.status)}</td>
                    <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
