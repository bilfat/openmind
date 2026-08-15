"use client";

import React, { useState, useEffect } from "react";
import {
  getStoredOrders,
  getOrderByOrderId,
  markOrderCheckedIn,
  OrderItem,
} from "@/lib/order-store";
import {
  ScanLine,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  Camera,
  RefreshCw,
  Sparkles,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminCheckInPage() {
  const [orders, setOrders] = useState<OrderItem[]>(() => getStoredOrders());
  const [manualInput, setManualInput] = useState("");
  const [scannedResult, setScannedResult] = useState<{
    order: OrderItem | null;
    status: "success" | "already_checked_in" | "not_approved" | "not_found";
    message: string;
  } | null>(null);

  const [isScanning, setIsScanning] = useState(false);

  const refreshOrders = () => {
    setOrders(getStoredOrders());
  };


  const handleProcessCheckIn = (query: string) => {
    const q = query.trim();
    if (!q) return;

    let targetOrder = getOrderByOrderId(q);

    // Try finding by NIM or Email if not found by Order ID
    if (!targetOrder) {
      targetOrder =
        orders.find(
          (o) =>
            o.nim.toLowerCase() === q.toLowerCase() ||
            o.email.toLowerCase() === q.toLowerCase()
        ) || null;
    }

    if (!targetOrder) {
      setScannedResult({
        order: null,
        status: "not_found",
        message: `Data tidak ditemukan untuk input "${q}".`,
      });
      return;
    }

    if (targetOrder.paymentStatus !== "approved") {
      setScannedResult({
        order: targetOrder,
        status: "not_approved",
        message: `Pesanan ini belum disetujui (Status: ${targetOrder.paymentStatus}). Harap selesaikan verifikasi pembayaran terlebih dahulu.`,
      });
      return;
    }

    if (targetOrder.checkedIn) {
      setScannedResult({
        order: targetOrder,
        status: "already_checked_in",
        message: `Peserta ini sudah melakukan check-in pada pukul ${targetOrder.checkedInAt || "hari ini"}.`,
      });
      return;
    }

    // Success Check-in!
    markOrderCheckedIn(targetOrder.orderId);
    refreshOrders();
    const updated = getOrderByOrderId(targetOrder.orderId);

    setScannedResult({
      order: updated,
      status: "success",
      message: "Check-in Berhasil! Silakan berikan Merchandise & Name Tag kepada peserta.",
    });
    setManualInput("");
  };

  const handleSimulateQRScan = (orderId: string) => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      handleProcessCheckIn(orderId);
    }, 600);
  };

  const checkedInList = orders.filter((o) => o.checkedIn);
  const totalApproved = orders.filter((o) => o.paymentStatus === "approved").length;
  const attendanceRate = totalApproved > 0 ? Math.round((checkedInList.length / totalApproved) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 mb-2 border border-gold-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            <span>OPERASIONAL MEJA REGISTRASI</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Check-In Peserta (Hari H)
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
            Pindai QR Code E-Ticket peserta atau cari manual via Order ID / NIM untuk verifikasi kehadiran.
          </p>
        </div>

        <div className="rounded-2xl bg-secondary/40 p-4 border border-border flex items-center gap-6">
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              TOTAL HADIR
            </span>
            <p className="font-display text-2xl font-black text-emerald-600">
              {checkedInList.length} <span className="text-xs text-muted-foreground font-normal">/ {totalApproved} Pax</span>
            </p>
          </div>
          <div className="border-l border-border pl-6">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              PERSENTASE
            </span>
            <p className="font-display text-2xl font-black text-navy-900">
              {attendanceRate}%
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: QR Scanner & Manual Input Box */}
        <div className="lg:col-span-6 space-y-6">
          {/* Scanner Viewfinder Box */}
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-2">
                <Camera className="h-4 w-4 text-gold-600" />
                <span>Kamera Pemindai QR E-Ticket</span>
              </span>
            </div>

            {/* Viewfinder Graphic */}
            <div className="relative aspect-[4/3] rounded-2xl bg-navy-950 overflow-hidden flex flex-col items-center justify-center p-6 text-center border-2 border-gold-500/40">
              {/* Corner Targets */}
              <div className="absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-gold-400" />
              <div className="absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-gold-400" />
              <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-gold-400" />
              <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-gold-400" />

              {/* Animated Laser Line */}
              <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gold-400 shadow-lg shadow-gold-500/80 animate-pulse" />

              <ScanLine className="h-12 w-12 text-gold-400 mb-3 animate-bounce" />
              <p className="text-xs font-semibold text-ivory-100 max-w-xs">
                Arahkan QR Code E-Ticket peserta ke dalam kotak pemindai
              </p>
              <p className="text-[10px] text-ivory-200/50 mt-1">
                Kamera aktif secara otomatis
              </p>
            </div>

            {/* Manual Quick Search */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-navy-900">
                Atau Cari Manual (Order ID / NIM):
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessCheckIn(manualInput);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Contoh: OM26-00124 atau 6706220014"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/20 py-3 pl-10 pr-4 text-xs font-semibold text-navy-900 focus:border-gold-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-gold-500 px-5 py-3 text-xs font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-sm active:scale-95"
                >
                  Check-In
                </button>
              </form>
            </div>

            {/* Quick Demo Scan Buttons */}
            <div className="border-t border-border pt-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                Simulasi Scan Demo:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulateQRScan("OM26-00124")}
                  className="rounded-lg bg-secondary/60 px-3 py-1 text-[11px] font-mono text-navy-900 hover:bg-gold-500/20 hover:text-gold-700"
                >
                  Scan OM26-00124 (Annisa)
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateQRScan("OM26-00125")}
                  className="rounded-lg bg-secondary/60 px-3 py-1 text-[11px] font-mono text-navy-900 hover:bg-gold-500/20 hover:text-gold-700"
                >
                  Scan OM26-00125 (Fajar - Sudah Hadir)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Scan Verification Result Card & Live Attendance Feed */}
        <div className="lg:col-span-6 space-y-6">
          {/* Result Card */}
          {scannedResult && (
            <div
              className={cn(
                "rounded-3xl border p-6 sm:p-8 shadow-lg space-y-4 transition-all",
                scannedResult.status === "success" &&
                  "border-emerald-500 bg-emerald-500/10 text-emerald-950",
                scannedResult.status === "already_checked_in" &&
                  "border-amber-500 bg-amber-500/10 text-amber-950",
                scannedResult.status === "not_approved" &&
                  "border-orange-500 bg-orange-500/10 text-orange-950",
                scannedResult.status === "not_found" &&
                  "border-destructive bg-destructive/10 text-destructive"
              )}
            >
              <div className="flex items-center gap-3">
                {scannedResult.status === "success" && (
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 flex-shrink-0" />
                )}
                {scannedResult.status === "already_checked_in" && (
                  <AlertTriangle className="h-8 w-8 text-amber-600 flex-shrink-0" />
                )}
                {scannedResult.status === "not_approved" && (
                  <XCircle className="h-8 w-8 text-orange-600 flex-shrink-0" />
                )}
                {scannedResult.status === "not_found" && (
                  <XCircle className="h-8 w-8 text-destructive flex-shrink-0" />
                )}
                <div>
                  <h3 className="font-display text-lg font-bold">
                    {scannedResult.status === "success" && "CHECK-IN BERHASIL ✓"}
                    {scannedResult.status === "already_checked_in" && "PERINGATAN: SUDAH CHECK-IN"}
                    {scannedResult.status === "not_approved" && "STATUS BELUM APPROVED"}
                    {scannedResult.status === "not_found" && "PESANAN TIDAK DITEMUKAN"}
                  </h3>
                  <p className="text-xs opacity-90 mt-0.5">
                    {scannedResult.message}
                  </p>
                </div>
              </div>

              {scannedResult.order && (
                <div className="rounded-2xl bg-white p-4 text-xs text-navy-900 border border-border/80 shadow-sm space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-mono font-bold text-sm text-gold-600">
                      {scannedResult.order.orderId}
                    </span>
                    <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-[10px] font-bold text-ivory-100">
                      {scannedResult.order.ticketName} ({scannedResult.order.quantity} Pax)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">Nama Peserta:</span>
                      <strong>{scannedResult.order.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">NIM:</span>
                      <strong className="font-mono">{scannedResult.order.nim}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Fakultas:</span>
                      <span>{scannedResult.order.faculty}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Waktu Check-In:</span>
                      <span className="font-bold text-emerald-600">
                        {scannedResult.order.checkedInAt || "Baru Saja"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Check-in Feed */}
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span>Log Kehadiran Peserta Terakhir</span>
              </h3>
              <span className="text-xs text-muted-foreground font-semibold">
                {checkedInList.length} Orang
              </span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {checkedInList.length === 0 ? (
                <p className="text-xs text-center text-muted-foreground py-6">
                  Belum ada peserta yang melakukan check-in hari ini.
                </p>
              ) : (
                checkedInList.map((order) => (
                  <div
                    key={order.orderId}
                    className="rounded-2xl border border-border bg-secondary/20 p-3.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <strong className="block text-navy-900 font-bold">
                        {order.customerName}
                      </strong>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {order.orderId} • NIM: {order.nim} • {order.ticketName}
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700 whitespace-nowrap">
                      {order.checkedInAt || "Hadir"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
