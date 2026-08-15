"use client";

import React, { useState } from "react";
import { getStoredOrders } from "@/lib/order-store";
import {
  Send,
  Mail,
  MessageSquare,
  Users,
  CheckCircle2,
  Sparkles,
  Smartphone,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminBroadcastPage() {
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [audience, setAudience] = useState<"all" | "approved" | "pending" | "vip">("approved");
  const [subject, setSubject] = useState("Pengingat Jadwal & E-Ticket Resmi OPEN MIND 2026");
  const [message, setMessage] = useState(
    `Halo {Nama Peserta}!\n\nKami dari panitia OPEN MIND 2026 menginformasikan bahwa acara seminar akan diselenggarakan pada:\n📅 Jumat, 18 September 2026\n⏰ 09:00 - 17:00 WIB\n📍 Telkom University, Bandung\n\nPastikan Anda telah mengunduh E-Ticket digital dan menyiapkan QR Code untuk ditunjukkan pada meja registrasi hari H.\n\nSampai jumpa di venue!\nSalam,\nHIPMI PT Telkom University`
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const orders = getStoredOrders();

  const recipientCount = orders.filter((o) => {
    if (audience === "approved") return o.paymentStatus === "approved";
    if (audience === "pending") return o.paymentStatus === "pending";
    if (audience === "vip") return o.ticketId === "vip-pass";
    return true;
  }).length;

  const handleApplyTemplate = (type: string) => {
    if (type === "reminder") {
      setSubject("Pengingat H-1 Acara OPEN MIND 2026");
      setMessage(
        `Halo {Nama Peserta}!\n\nJangan lupa, besok adalah hari pelaksanaan OPEN MIND 2026!\n📅 18 September 2026 | 09:00 WIB\n📍 Telkom University\n\nSiapkan E-Ticket Anda dari link: https://openmind2026.id/tiket?tab=check\n\nSampai jumpa besok!`
      );
    } else if (type === "approved") {
      setSubject("Pembayaran Anda Berhasil Divalidasi — E-Ticket Aktif");
      setMessage(
        `Halo {Nama Peserta},\n\nPembayaran Anda untuk tiket {Jenis Tiket} (Order ID: {Order ID}) telah diverifikasi oleh tim panitia.\n\nE-Ticket resmi Anda telah terbit dan siap digunakan. Silakan buka halaman Cek Tiket untuk melihat QR Pass Anda.\n\nTerima kasih!`
      );
    } else if (type === "dresscode") {
      setSubject("Panduan Dresscode & Ketentuan Masuk Venue");
      setMessage(
        `Halo {Nama Peserta}!\n\nBerikut panduan dresscode untuk menghadiri OPEN MIND 2026:\n👔 Dresscode: Smart Casual / Business Casual\n🚪 Pintu registrasi dibuka mulai pukul 08:00 WIB.\n\nHarap hadir tepat waktu!`
      );
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Broadcast & Notifikasi Massal
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70 mt-1">
            Kirim pengumuman, pengingat E-Ticket, dan info penting kepada seluruh peserta via WhatsApp & Email.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Broadcast Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <form onSubmit={handleSendBroadcast} className="space-y-5">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-2">
                  Saluran Pengiriman (Channel)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setChannel("whatsapp")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-bold transition-all border",
                      channel === "whatsapp"
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                        : "bg-secondary/30 border-border text-navy-900 hover:bg-secondary/60"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>WhatsApp Official API</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel("email")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-bold transition-all border",
                      channel === "email"
                        ? "bg-navy-900 border-navy-900 text-gold-400 shadow-md"
                        : "bg-secondary/30 border-border text-navy-900 hover:bg-secondary/60"
                    )}
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Blast (SMTP)</span>
                  </button>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-2">
                  Target Peserta (Audience)
                </label>
                <select
                  value={audience}
                  onChange={(e) =>
                    setAudience(e.target.value as "all" | "approved" | "pending" | "vip")
                  }
                  className="w-full rounded-xl border border-border bg-secondary/20 p-3 text-xs text-navy-900 font-semibold focus:border-gold-500 focus:bg-white"
                >
                  <option value="approved">Peserta Terverifikasi (Status: Approved) — {orders.filter(o => o.paymentStatus === "approved").length} Orang</option>
                  <option value="all">Semua Pendaftar (Seluruh Database) — {orders.length} Orang</option>
                  <option value="pending">Peserta Menunggu Pembayaran (Pending) — {orders.filter(o => o.paymentStatus === "pending").length} Orang</option>
                  <option value="vip">Pemegang Tiket VIP Pass Saja</option>
                </select>
              </div>

              {/* Quick Preset Templates */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Template Cepat:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("reminder")}
                    className="rounded-lg bg-secondary/60 px-3 py-1 text-xs text-navy-900 hover:bg-gold-500/20 hover:text-gold-700 transition-colors"
                  >
                    Reminder H-1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("approved")}
                    className="rounded-lg bg-secondary/60 px-3 py-1 text-xs text-navy-900 hover:bg-gold-500/20 hover:text-gold-700 transition-colors"
                  >
                    Tiket Disetujui
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("dresscode")}
                    className="rounded-lg bg-secondary/60 px-3 py-1 text-xs text-navy-900 hover:bg-gold-500/20 hover:text-gold-700 transition-colors"
                  >
                    Info Dresscode
                  </button>
                </div>
              </div>

              {/* Subject if Email */}
              {channel === "email" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1.5">
                    Subjek Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/20 p-3 text-xs text-navy-900 font-semibold focus:border-gold-500 focus:bg-white"
                  />
                </div>
              )}

              {/* Message Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-navy-900">
                    Isi Pesan Peserta *
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Variabel: {"{Nama Peserta}"}, {"{Order ID}"}, {"{Jenis Tiket}"}
                  </span>
                </div>
                <textarea
                  rows={7}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/20 p-3.5 text-xs text-navy-900 font-medium focus:border-gold-500 focus:bg-white leading-relaxed"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground">
                  Akan dikirim ke: <strong className="text-navy-900">{recipientCount} kontak</strong>
                </div>

                <button
                  type="submit"
                  disabled={isSending || recipientCount === 0}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-navy-950 hover:bg-gold-400 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSending ? (
                    <span>Mengirimkan Pesan...</span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Kirim Broadcast ({recipientCount})</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {sentSuccess && (
              <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>Pesan broadcast berhasil dikirim ke {recipientCount} penerima!</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Preview Box */}
        <div className="lg:col-span-5 sticky top-28 space-y-4">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-gold-600" />
                <span>Pratinjau Live {channel === "whatsapp" ? "WhatsApp" : "Email"}</span>
              </span>
            </div>

            {channel === "whatsapp" ? (
              /* WhatsApp Preview Bubble */
              <div className="rounded-2xl bg-[#EFEAE2] p-4 text-xs text-navy-950 space-y-2 font-sans border border-[#DFD8CE] shadow-inner">
                <div className="rounded-xl bg-white p-3.5 shadow-sm space-y-2 relative border border-[#E0DACE]">
                  <p className="font-bold text-emerald-700 text-[11px] border-b border-gray-100 pb-1">
                    OPEN MIND 2026 Official Helpdesk
                  </p>
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-800">
                    {message.replace(/{Nama Peserta}/g, "Annisa Humairah Rosyid")}
                  </p>
                  <span className="block text-right text-[9px] text-gray-400">
                    14:30 ✓✓
                  </span>
                </div>
              </div>
            ) : (
              /* Email Preview */
              <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-xs space-y-3">
                <div className="border-b border-border pb-2 text-[11px]">
                  <span className="text-muted-foreground">Subjek: </span>
                  <strong className="text-navy-900">{subject}</strong>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
                  <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                    <span className="font-bold text-navy-900">OPEN MIND 2026</span>
                    <span className="text-[10px] text-gold-600 font-bold">HIPMI Tel-U</span>
                  </div>
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-navy-900/80">
                    {message.replace(/{Nama Peserta}/g, "Annisa Humairah Rosyid")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
