"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  CheckCircle2,
  Copy,
  ArrowRight,
  User,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  BookOpen,
  Ticket,
  Hash,
  Banknote,
} from "lucide-react";
import { getStoredOrders, saveNewOrder, generateNextOrderId, OrderItem } from "@/lib/order-store";
import { getStoredTickets, updateTicketIssuedCount } from "@/lib/ticket-store";
import { TicketType } from "@/data/tickets";

const faculties = [
  "Fakultas Ilmu Terapan",
  "Fakultas Industri Kreatif",
  "Fakultas Informatika",
  "Fakultas Teknik Elektro",
  "Fakultas Rekayasa Industri",
  "Fakultas Ekonomi dan Bisnis",
  "Fakultas Komunikasi Sosial",
  "Lainnya",
];

interface SuccessInfo {
  orderId: string;
  ticketName: string;
  customerName: string;
  quantity: number;
  totalPrice: number;
}

export default function WalkInPage() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [form, setForm] = useState({
    customerName: "",
    email: "",
    whatsapp: "",
    nim: "",
    faculty: "",
    studyProgram: "",
    instagram: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTickets(getStoredTickets().filter((t) => t.status === "ACTIVE"));
  }, []);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const unitPrice = selectedTicket?.finalPrice ?? 0;
  const totalPrice = unitPrice * quantity;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !form.customerName.trim() || !form.nim.trim()) return;

    setIsSubmitting(true);

    // Simulate brief processing delay for UX
    await new Promise((r) => setTimeout(r, 600));

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} WIB`;
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${timeStr}`;

    const newOrder: OrderItem = {
      orderId: generateNextOrderId(),
      customerName: form.customerName.trim(),
      email: form.email.trim() || `${form.nim.trim()}@student.telkomuniversity.ac.id`,
      whatsapp: form.whatsapp.trim(),
      nim: form.nim.trim(),
      faculty: form.faculty || "Lainnya",
      studyProgram: form.studyProgram.trim() || "-",
      instagram: form.instagram.trim() || undefined,
      ticketId: selectedTicket.id,
      ticketName: selectedTicket.name,
      ticketCategory: selectedTicket.type === "FREE" ? "free" : "paid",
      quantity,
      totalPrice,
      paymentStatus: "approved",
      paymentMethod: selectedTicket.type === "FREE" ? "Free Pass" : "Walk-In / Cash",
      createdAt: dateStr,
      checkedIn: false,
    };

    saveNewOrder(newOrder);
    updateTicketIssuedCount(selectedTicket.id, quantity);

    setSuccess({
      orderId: newOrder.orderId,
      ticketName: newOrder.ticketName,
      customerName: newOrder.customerName,
      quantity: newOrder.quantity,
      totalPrice: newOrder.totalPrice,
    });

    setIsSubmitting(false);
  };

  const handleCopyOrderId = () => {
    if (success) {
      navigator.clipboard.writeText(success.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNewOrder = () => {
    setSuccess(null);
    setForm({
      customerName: "",
      email: "",
      whatsapp: "",
      nim: "",
      faculty: "",
      studyProgram: "",
      instagram: "",
    });
    setSelectedTicketId("");
    setQuantity(1);
  };

  // ──── SUCCESS SCREEN ────
  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="rounded-3xl border-2 border-emerald-500/40 bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold text-navy-900">
              Tiket Berhasil Dibuat!
            </h2>
            <p className="mt-1 text-sm text-navy-900/60">
              Pesanan sudah langsung <strong className="text-emerald-700">approved</strong> — berikan Order ID ini ke pembeli.
            </p>
          </div>

          {/* Order ID Display */}
          <div className="p-6 space-y-4">
            <div className="rounded-2xl border border-dashed border-gold-400 bg-gold-500/5 p-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-widest text-navy-900/40 mb-1">
                Order ID
              </p>
              <p className="font-mono text-2xl font-black text-navy-900 tracking-wider">
                {success.orderId}
              </p>
              <button
                type="button"
                onClick={handleCopyOrderId}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-white px-3 py-1 text-[11px] font-bold text-gold-700 transition-all hover:bg-gold-500/10 btn-scale"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Tersalin!" : "Salin Order ID"}
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Nama
                </span>
                <span className="font-semibold text-navy-900">{success.customerName}</span>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Tiket
                </span>
                <span className="font-semibold text-gold-700">{success.ticketName}</span>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Qty
                </span>
                <span className="font-semibold text-navy-900">{success.quantity} Pax</span>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Total
                </span>
                <span className="font-semibold text-emerald-700">
                  {success.totalPrice === 0
                    ? "GRATIS"
                    : `Rp ${success.totalPrice.toLocaleString("id-ID")}`}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              ✅ Status pembayaran otomatis <strong>Approved</strong>. Pembeli bisa langsung cek e-ticket di halaman <code>/tiket</code> menggunakan Order ID ini.
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-100 p-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleNewOrder}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-navy-900/20 px-4 py-3 text-sm font-bold text-navy-900 transition-all hover:bg-navy-900/5 btn-scale"
            >
              <ShoppingCart className="h-4 w-4" />
              Buat Tiket Lainnya
            </button>
            <Link
              href="/admin/orders"
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-4 py-3 text-sm font-bold text-navy-950 transition-all hover:bg-gold-400 shadow-md btn-scale"
            >
              Lihat Semua Orders
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ──── FORM ────
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-gold-700 mb-3">
          <ShoppingCart className="h-3 w-3" />
          Walk-In Sales
        </div>
        <h1 className="font-display text-3xl font-bold text-navy-900">
          Jual Tiket Langsung
        </h1>
        <p className="mt-1 text-sm text-navy-900/60 max-w-lg">
          Untuk pembeli yang tidak bisa mengakses website. Isi data mereka di sini — tiket akan langsung{" "}
          <strong className="text-emerald-700">approved</strong> tanpa perlu upload bukti transfer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Section 1: Ticket Selection ── */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500/10 text-gold-600">
              <Ticket className="h-4 w-4" />
            </div>
            <h2 className="font-display text-lg font-bold text-navy-900">Pilih Tiket</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ticket Type */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="ticket-select">
                Tipe Tiket
              </label>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select
                  id="ticket-select"
                  value={selectedTicketId}
                  onChange={(e) => {
                    setSelectedTicketId(e.target.value);
                    setQuantity(1);
                  }}
                  required
                  className="w-full appearance-none rounded-xl border border-border bg-gray-50 py-3 pl-10 pr-4 text-sm font-medium text-navy-900 transition-colors focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/20 outline-none"
                >
                  <option value="">— Pilih tiket —</option>
                  {tickets.map((t) => {
                    const remaining = t.quota - t.issued;
                    return (
                      <option key={t.id} value={t.id} disabled={remaining <= 0}>
                        {t.name} — {t.type === "FREE" ? "GRATIS" : `Rp ${t.finalPrice.toLocaleString("id-ID")}`}
                        {remaining > 0 ? ` (${remaining} sisa)` : " (HABIS)"}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Quantity */}
            {selectedTicket && (
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="quantity-input">
                  Jumlah
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(selectedTicket.minPurchase, quantity - 1))}
                    disabled={quantity <= selectedTicket.minPurchase}
                    className="h-10 w-10 rounded-xl border border-border bg-gray-50 text-lg font-bold text-navy-900 hover:bg-gray-100 transition-colors disabled:opacity-30 touch-target"
                  >
                    −
                  </button>
                  <input
                    id="quantity-input"
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v >= selectedTicket.minPurchase && v <= selectedTicket.maxPurchase && v <= selectedTicket.quota - selectedTicket.issued) {
                        setQuantity(v);
                      }
                    }}
                    min={selectedTicket.minPurchase}
                    max={Math.min(selectedTicket.maxPurchase, selectedTicket.quota - selectedTicket.issued)}
                    className="h-10 w-16 rounded-xl border border-border bg-gray-50 text-center text-sm font-bold text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(selectedTicket.maxPurchase, selectedTicket.quota - selectedTicket.issued, quantity + 1))}
                    disabled={quantity >= selectedTicket.maxPurchase || quantity >= selectedTicket.quota - selectedTicket.issued}
                    className="h-10 w-10 rounded-xl border border-border bg-gray-50 text-lg font-bold text-navy-900 hover:bg-gray-100 transition-colors disabled:opacity-30 touch-target"
                  >
                    +
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-navy-900/40">
                  Min: {selectedTicket.minPurchase} · Max: {selectedTicket.maxPurchase} · Sisa: {selectedTicket.quota - selectedTicket.issued}
                </p>
              </div>
            )}

            {/* Price Summary */}
            {selectedTicket && (
              <div className="flex flex-col justify-end">
                <div className="rounded-xl bg-gold-500/10 border border-gold-500/20 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Banknote className="h-4 w-4 text-gold-600" />
                    <span className="text-xs font-bold text-navy-900/60 uppercase tracking-wider">Total Bayar</span>
                  </div>
                  <p className="font-display text-2xl font-black text-navy-900">
                    {totalPrice === 0 ? (
                      <span className="text-emerald-600">GRATIS</span>
                    ) : (
                      `Rp ${totalPrice.toLocaleString("id-ID")}`
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Buyer Identity ── */}
        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900/5 text-navy-900">
              <User className="h-4 w-4" />
            </div>
            <h2 className="font-display text-lg font-bold text-navy-900">Data Pembeli</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="walkin-name">
                Nama Lengkap *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="walkin-name"
                  name="customerName"
                  type="text"
                  value={form.customerName}
                  onChange={handleChange}
                  required
                  placeholder="Masukkan nama lengkap pembeli"
                  className="w-full rounded-xl border border-border bg-gray-50 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-gray-400 transition-colors focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/20 outline-none"
                />
              </div>
            </div>

            {/* NIM */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="walkin-nim">
                NIM / No. Identitas *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="walkin-nim"
                  name="nim"
                  type="text"
                  value={form.nim}
                  onChange={handleChange}
                  required
                  placeholder="6706220014"
                  className="w-full rounded-xl border border-border bg-gray-50 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-gray-400 transition-colors focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/20 outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="walkin-email">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="walkin-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Otomatis jika kosong"
                  className="w-full rounded-xl border border-border bg-gray-50 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-gray-400 transition-colors focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/20 outline-none"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="walkin-wa">
                No. WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="walkin-wa"
                  name="whatsapp"
                  type="tel"
                  value={form.whatsapp}
                  onChange={handleChange}
                  placeholder="08xxxxxxxxxx"
                  className="w-full rounded-xl border border-border bg-gray-50 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-gray-400 transition-colors focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/20 outline-none"
                />
              </div>
            </div>

            {/* Instagram */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="walkin-ig">
                Instagram <span className="font-normal text-navy-900/40">(opsional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm font-bold">@</span>
                <input
                  id="walkin-ig"
                  name="instagram"
                  type="text"
                  value={form.instagram}
                  onChange={handleChange}
                  placeholder="username"
                  className="w-full rounded-xl border border-border bg-gray-50 py-3 pl-9 pr-4 text-sm text-navy-900 placeholder:text-gray-400 transition-colors focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/20 outline-none"
                />
              </div>
            </div>

            {/* Faculty */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="walkin-faculty">
                Fakultas
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select
                  id="walkin-faculty"
                  name="faculty"
                  value={form.faculty}
                  onChange={handleChange}
                  className="w-full appearance-none rounded-xl border border-border bg-gray-50 py-3 pl-10 pr-4 text-sm text-navy-900 transition-colors focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/20 outline-none"
                >
                  <option value="">— Pilih fakultas —</option>
                  {faculties.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Study Program */}
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1.5" htmlFor="walkin-prodi">
                Program Studi
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  id="walkin-prodi"
                  name="studyProgram"
                  type="text"
                  value={form.studyProgram}
                  onChange={handleChange}
                  placeholder="Contoh: Informatika"
                  className="w-full rounded-xl border border-border bg-gray-50 py-3 pl-10 pr-4 text-sm text-navy-900 placeholder:text-gray-400 transition-colors focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/20 outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Submit ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <p className="text-xs text-navy-900/40 max-w-sm">
            Dengan menekan tombol di bawah, kamu mengonfirmasi bahwa pembeli sudah melakukan pembayaran secara langsung (cash / tunai).
          </p>
          <button
            type="submit"
            disabled={isSubmitting || !selectedTicketId || !form.customerName.trim() || !form.nim.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed btn-scale"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Buat & Langsung Approved
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
