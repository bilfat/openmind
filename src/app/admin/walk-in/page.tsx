"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Banknote,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ParticipantForm {
  fullName: string;
  email: string;
  whatsapp: string;
  nim: string;
  faculty: string;
  studyProgram: string;
  instagram?: string;
}

interface TicketTypeItem {
  id: string;
  name: string;
  ticket_type: string;
  price: number;
  final_price: number;
  is_active: boolean;
  status: string;
  visibility: string;
  quota: number;
  remaining_quota: number;
  min_purchase: number;
  max_purchase: number;
}

interface SuccessInfo {
  orderId: string;
  orderCode: string;
  totalAmount: number;
  participantCount: number;
  tickets: Array<{ ticketCode: string; participantName: string }>;
}

export default function WalkInPage() {
  const [tickets, setTickets] = useState<TicketTypeItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK_TRANSFER" | "QRIS">("CASH");

  const [participants, setParticipants] = useState<ParticipantForm[]>([
    { fullName: "", email: "", whatsapp: "", nim: "", faculty: "Fakultas Ilmu Terapan", studyProgram: "", instagram: "" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessInfo | null>(null);

  const syncParticipants = (qty: number) => {
    setParticipants((prev) => {
      if (qty === prev.length) return prev;
      if (qty > prev.length) {
        const diff = qty - prev.length;
        return [
          ...prev,
          ...Array(diff).fill({ fullName: "", email: "", whatsapp: "", nim: "", faculty: "Fakultas Ilmu Terapan", studyProgram: "", instagram: "" }),
        ];
      }
      return prev.slice(0, qty);
    });
  };

  const clampQuantityFor = (t: TicketTypeItem, qty: number) => {
    const m = Math.max(1, Number(t.min_purchase ?? 1));
    const M = Math.max(m, Math.min(Number(t.max_purchase ?? 10), Number(t.remaining_quota ?? t.quota ?? 10)));
    return Math.max(m, Math.min(M, qty));
  };

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/admin/walk-in/ticket-types");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal memuat jenis tiket.");
      }
      const activeList = (json.data || []).filter(
        (t: TicketTypeItem) => t.status === "ACTIVE" && t.visibility !== "PRIVATE" && Number(t.remaining_quota) > 0
      );
      const nextId = activeList.some((t: TicketTypeItem) => t.id === selectedTicketId)
        ? selectedTicketId
        : activeList.length > 0
          ? activeList[0].id
          : "";
      setTickets(activeList);
      setSelectedTicketId(nextId);
      if (nextId) {
        const t = activeList.find((x: TicketTypeItem) => x.id === nextId);
        if (t) {
          const clamped = clampQuantityFor(t, quantity);
          setQuantity(clamped);
          syncParticipants(clamped);
        }
      }
    } catch (err: unknown) {
      setTicketsError(err instanceof Error ? err.message : "Gagal memuat jenis tiket.");
      setTickets([]);
      setSelectedTicketId("");
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    setTicketsError(null);
    setLoadingTickets(true);
    loadTickets();
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const unitPrice = selectedTicket ? Number(selectedTicket.final_price ?? selectedTicket.price ?? 0) : 0;
  const totalPrice = unitPrice * quantity;
  const priceOf = (t: TicketTypeItem) => Number(t.final_price ?? t.price ?? 0);

  const minQty = selectedTicket ? Math.max(1, Number(selectedTicket.min_purchase ?? 1)) : 1;
  const maxQty = selectedTicket
    ? Math.max(minQty, Math.min(Number(selectedTicket.max_purchase ?? 10), Number(selectedTicket.remaining_quota ?? selectedTicket.quota ?? 10)))
    : 10;

  const handleTicketSelect = (id: string) => {
    setSelectedTicketId(id);
    const t = tickets.find((x) => x.id === id);
    if (t) {
      const clamped = clampQuantityFor(t, quantity);
      setQuantity(clamped);
      syncParticipants(clamped);
    }
  };

  const handleQuantityChange = (newQty: number) => {
    const validQty = Math.max(minQty, Math.min(maxQty, newQty));
    setQuantity(validQty);
    syncParticipants(validQty);
  };

  const handleParticipantChange = (index: number, field: keyof ParticipantForm, value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) {
      setErrorMsg("Harap pilih jenis tiket terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      ticketSelections: [{ ticketId: selectedTicketId, quantity }],
      participants: participants.map((p) => ({
        fullName: p.fullName.trim(),
        email: p.email.trim() || `${p.nim.trim()}@student.telkomuniversity.ac.id`,
        whatsapp: p.whatsapp.trim(),
        nim: p.nim.trim(),
        faculty: p.faculty || "Lainnya",
        studyProgram: p.studyProgram.trim() || "-",
        instagram: p.instagram?.trim() || undefined,
      })),
      paymentMethod,
    };

    try {
      const res = await fetch("/api/admin/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memproses pendaftaran walk-in.");
      }

      setSuccess({
        orderId: data.orderId,
        orderCode: data.orderCode || data.orderId,
        totalAmount: data.totalAmount || totalPrice,
        participantCount: participants.length,
        tickets: data.issuedTickets || [],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat memproses order.";
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccess(null);
    setErrorMsg(null);
    setQuantity(1);
    setParticipants([{ fullName: "", email: "", whatsapp: "", nim: "", faculty: "Fakultas Ilmu Terapan", studyProgram: "", instagram: "" }]);
  };

  return (
    <div className="space-y-6 max-w-5xl w-full mx-auto pb-12">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 mb-2">
            <Banknote className="h-3.5 w-3.5" />
            <span>KASIR ONSITE & WALK-IN</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Pendaftaran Tiket OTS / Walk-In
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70">
            Pendaftaran tiket langsung di venue event. Transaksi kasir langsung terkonfirmasi otomatis dan e-ticket diterbitkan secara instant.
          </p>
        </div>
      </div>

      {/* Success State Screen */}
      {success ? (
        <div className="rounded-3xl border border-gold-500/40 bg-navy-950 text-ivory-100 p-6 sm:p-10 space-y-6 shadow-xl animate-fade-in w-full relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-gold-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-gold-500 to-gold-300 text-navy-950 shadow-lg shadow-gold-500/25">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <span className="text-xs font-bold text-gold-400 uppercase tracking-widest">TRANSAKSI WALK-IN BERHASIL</span>
              <h2 className="font-display text-2xl font-bold text-ivory-100">Order #{success.orderCode}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-navy-900/60 p-4 text-sm border border-navy-800">
            <div>
              <span className="text-xs text-ivory-200/70">Total Pembayaran:</span>
              <p className="font-bold text-gold-400 text-lg">Rp {success.totalAmount.toLocaleString("id-ID")}</p>
            </div>
            <div>
              <span className="text-xs text-ivory-200/70">Jumlah Peserta:</span>
              <p className="font-bold text-ivory-100 text-lg">{success.participantCount} Orang</p>
            </div>
            <div>
              <span className="text-xs text-ivory-200/70">Status Tiket:</span>
              <p className="font-bold text-emerald-400 text-lg">PAID & ISSUED</p>
            </div>
          </div>

          {/* Issued Tickets Code */}
          {success.tickets.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400">E-Ticket Yang Diterbitkan:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {success.tickets.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-navy-900/80 p-3 border border-navy-800">
                    <div>
                      <p className="text-xs text-ivory-200/70">{t.participantName}</p>
                      <p className="font-mono font-bold text-gold-400 text-base">{t.ticketCode}</p>
                    </div>
                    <Link
                      href={`/ticket/${t.ticketCode}`}
                      target="_blank"
                      className="rounded-lg bg-gold-500/15 px-3 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/25"
                    >
                      Buka E-Ticket
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-navy-800">
            <button
              onClick={handleReset}
              className="flex-1 rounded-2xl bg-gold-500 py-3.5 text-sm font-bold text-navy-950 hover:bg-gold-400 transition"
            >
              + Transaksi Walk-In Baru
            </button>
            <Link
              href="/admin/orders"
              className="rounded-2xl border border-gold-500/40 px-6 py-3.5 text-sm font-bold text-ivory-100 hover:bg-navy-900"
            >
              Lihat Daftar Order
            </Link>
          </div>
        </div>
      ) : (
        /* Walk-In Form */
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8 items-start w-full">
          <div className="w-full lg:w-7/12 space-y-6">
            {/* Form Box */}
            <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-6 w-full">
              <div className="border-b border-border pb-4">
                <h3 className="font-display text-lg font-bold text-navy-900">1. Data Peserta Walk-In</h3>
                <p className="text-xs text-muted-foreground">Isi data lengkap peserta yang membeli di tempat.</p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-xs font-semibold text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {participants.map((p, index) => (
                <div key={index} className="space-y-4 border-b border-border pb-6 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-900 uppercase tracking-wider">Peserta #{index + 1}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap"
                      value={p.fullName}
                      onChange={(e) => handleParticipantChange(index, "fullName", e.target.value)}
                      className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">NIM *</label>
                      <input
                        type="text"
                        required
                        placeholder="6706220014"
                        value={p.nim}
                        onChange={(e) => handleParticipantChange(index, "nim", e.target.value)}
                        className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="email@domain.com"
                        value={p.email}
                        onChange={(e) => handleParticipantChange(index, "email", e.target.value)}
                        className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        placeholder="08123456789"
                        value={p.whatsapp}
                        onChange={(e) => handleParticipantChange(index, "whatsapp", e.target.value)}
                        className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Fakultas *</label>
                      <select
                        value={p.faculty}
                        onChange={(e) => handleParticipantChange(index, "faculty", e.target.value)}
                        className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                      >
                        {faculties.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Prodi *</label>
                    <input
                      type="text"
                      required
                      placeholder="D3 Sistem Informasi"
                      value={p.studyProgram}
                      onChange={(e) => handleParticipantChange(index, "studyProgram", e.target.value)}
                      className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Selection & Summary */}
          <div className="w-full lg:w-5/12 space-y-6">
            <div className="rounded-3xl border border-navy-900/20 bg-navy-950 text-ivory-100 p-6 shadow-md space-y-5">
              <h3 className="font-display text-lg font-bold border-b border-navy-800 pb-3 text-gold-400">
                2. Pilih Tiket & Metode
              </h3>

              {loadingTickets ? (
                <div className="flex items-center justify-center gap-2 text-center py-6 text-xs text-navy-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memuat jenis tiket...</span>
                </div>
              ) : ticketsError ? (
                <div className="space-y-3 py-2">
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{ticketsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full rounded-xl border border-navy-700 bg-navy-900 px-3 py-2 text-xs font-bold text-ivory-100 hover:bg-navy-800 transition cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 inline mr-1.5" />
                    Coba Muat Ulang
                  </button>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex items-start gap-2 rounded-xl border border-navy-700 bg-navy-900/60 p-3 text-xs text-ivory-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-gold-400" />
                  <span>Tidak ada tiket yang tersedia untuk Walk-In.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ivory-200/80 mb-2">Jenis Tiket</label>
                    <div className="space-y-2">
                      {tickets.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => handleTicketSelect(t.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-xl border text-xs transition flex justify-between items-start gap-3 cursor-pointer",
                            selectedTicketId === t.id
                              ? "border-gold-500 bg-gold-500/10 font-bold text-gold-400"
                              : "border-navy-800 bg-navy-900/60 text-ivory-200"
                          )}
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block truncate">{t.name}</span>
                            <span className="block mt-1 text-[10px] font-normal text-ivory-200/60">
                              Sisa kuota: {Number(t.remaining_quota)} pax
                              {t.ticket_type === "FREE" ? " · Gratis" : ""}
                            </span>
                          </span>
                          <span className="font-display font-black whitespace-nowrap">
                            {t.ticket_type === "FREE" ? "Gratis" : `Rp ${priceOf(t).toLocaleString("id-ID")}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <span>Jumlah Kuantitas:</span>
                    <div className="flex items-center gap-3 rounded-full bg-navy-900 border border-navy-800 p-1">
                      <button type="button" onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= minQty} className="p-1 rounded-full bg-navy-800 disabled:opacity-30 cursor-pointer">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-bold w-4 text-center">{quantity}</span>
                      <button type="button" onClick={() => handleQuantityChange(quantity + 1)} disabled={quantity >= maxQty} className="p-1 rounded-full bg-navy-800 disabled:opacity-30 cursor-pointer">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ivory-200/80 mb-2">Metode Pembayaran Kasir</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "BANK_TRANSFER" | "QRIS")}
                      className="w-full rounded-xl border border-navy-800 bg-navy-900 px-3 py-2 text-xs text-ivory-100"
                    >
                      <option value="CASH">CASH / TUNAI</option>
                      <option value="QRIS">QRIS ONSITE</option>
                      <option value="BANK_TRANSFER">TRANSFER BANK</option>
                    </select>
                  </div>

                  <div className="border-t border-navy-800 pt-4 flex justify-between items-baseline">
                    <span className="text-xs font-bold">Total Pembayaran:</span>
                    <span className="font-display text-2xl font-black text-gold-400">Rp {totalPrice.toLocaleString("id-ID")}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedTicketId}
                    className="w-full rounded-2xl bg-gold-500 py-3.5 text-sm font-bold text-navy-950 hover:bg-gold-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Memproses Order...</span>
                      </>
                    ) : (
                      "Proses Transaksi Kasir"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
