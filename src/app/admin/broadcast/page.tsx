"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Mail,
  MessageSquare,
  Users,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BroadcastSuccessData {
  broadcastId: string;
  recipientCount: number;
  status: string;
  createdAt: string;
}

export default function AdminBroadcastPage() {
  const [eventId, setEventId] = useState<string | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [title, setTitle] = useState("Pengingat H-1 OPEN MIND 2026");
  const [subject, setSubject] = useState("Pengingat Jadwal & E-Ticket Resmi OPEN MIND 2026");
  const [content, setContent] = useState(
    `Halo Peserta OPEN MIND 2026!\n\nKami dari panitia menginformasikan bahwa acara seminar akan diselenggarakan pada:\n📅 Jumat, 18 September 2026\n⏰ 09:00 - 17:00 WIB\n📍 Telkom University, Bandung\n\nPastikan Anda telah mengunduh E-Ticket digital dan menyiapkan QR Code untuk ditunjukkan pada meja registrasi hari H.\n\nSampai jumpa di venue!\nSalam,\nHIPMI PT Telkom University`
  );

  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<BroadcastSuccessData | null>(null);

  useEffect(() => {
    async function loadActiveEvent() {
      try {
        const res = await fetch("/api/admin/event");
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setEventId(json.data.id || "00000000-0000-0000-0000-000000000001");
        }
      } catch (err) {
        console.error("Gagal memuat ID event:", err);
      } finally {
        setLoadingEvent(false);
      }
    }
    loadActiveEvent();
  }, []);

  const handleApplyTemplate = (type: string) => {
    if (type === "reminder") {
      setTitle("Pengingat H-1 Acara");
      setSubject("Pengingat H-1 Acara OPEN MIND 2026");
      setContent(
        `Halo Peserta!\n\nJangan lupa, besok adalah hari pelaksanaan OPEN MIND 2026!\n📅 18 September 2026 | 09:00 WIB\n📍 Telkom University\n\nSiapkan E-Ticket Anda dari portal resmi.\n\nSampai jumpa besok!`
      );
    } else if (type === "approved") {
      setTitle("Pembayaran Valid — E-Ticket Aktif");
      setSubject("Pembayaran Anda Berhasil Divalidasi — E-Ticket Aktif");
      setContent(
        `Halo Peserta,\n\nPembayaran Anda untuk tiket OPEN MIND 2026 telah diverifikasi oleh tim panitia.\n\nE-Ticket resmi Anda telah terbit dan siap digunakan. Silakan buka halaman Cek Tiket untuk melihat QR Pass Anda.\n\nTerima kasih!`
      );
    } else if (type === "dresscode") {
      setTitle("Panduan Dresscode Venue");
      setSubject("Panduan Dresscode & Ketentuan Masuk Venue");
      setContent(
        `Halo Peserta!\n\nBerikut panduan dresscode untuk menghadiri OPEN MIND 2026:\n👔 Dresscode: Smart Casual / Business Casual\n🚪 Pintu registrasi dibuka mulai pukul 08:00 WIB.\n\nHarap hadir tepat waktu!`
      );
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !content.trim()) {
      setErrorMsg("Harap isi semua kolom judul, subjek, dan konten pesan.");
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessData(null);

    const targetEventId = eventId || "00000000-0000-0000-0000-000000000001";

    try {
      const res = await fetch("/api/admin/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: targetEventId,
          title: title.trim(),
          subject: subject.trim(),
          content: content.trim(),
          audience_type: "ALL_APPROVED",
        }),
      });

      const json = await res.json();

      if (res.status === 403) {
        throw new Error("Akses ditolak: Hanya Super Admin yang dapat mengirim campaign broadcast massal.");
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal membuat campaign broadcast.");
      }

      setSuccessData({
        broadcastId: json.data.broadcastId || json.data.id,
        recipientCount: json.data.recipientCount,
        status: json.data.status,
        createdAt: json.data.createdAt || new Date().toISOString(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan sistem saat mendistribusikan pesan.";
      setErrorMsg(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 border border-gold-500/20 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>BROADCAST CAMPAIGN API (SUPER ADMIN ONLY)</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            Broadcast Notifikasi Massal
          </h1>
          <p className="text-xs sm:text-sm text-navy-900/70">
            Kirim pengumuman dan pengingat E-Ticket secara massal kepada seluruh peserta terverifikasi (`ALL_APPROVED`).
          </p>
        </div>
      </div>

      {successData && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950 text-white p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">CAMPAIGN DISAMPAIKAN KE ANTRIAN SERVER</span>
              <h2 className="font-display text-2xl font-bold">Broadcast #{successData.broadcastId.slice(0, 8)}...</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-emerald-900/40 p-4 text-xs border border-emerald-500/20">
            <div>
              <span className="text-emerald-200/70">Status Antrian:</span>
              <p className="font-bold text-emerald-400 text-sm uppercase">{successData.status}</p>
            </div>
            <div>
              <span className="text-emerald-200/70">Penerima Snapshot:</span>
              <p className="font-bold text-gold-400 text-sm">{successData.recipientCount} Peserta</p>
            </div>
            <div>
              <span className="text-emerald-200/70">Waktu Dibuat:</span>
              <p className="font-bold text-white text-sm">{new Date(successData.createdAt).toLocaleTimeString("id-ID")}</p>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-4 text-xs font-semibold text-destructive border border-destructive/20">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Broadcast Form */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm space-y-5">
            <form onSubmit={handleSendBroadcast} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Judul Campaign Internal *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Broadcast Pengingat H-1 Venue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Subjek / Header Pesan *</label>
                <input
                  type="text"
                  required
                  placeholder="Subjek email atau header pesan WhatsApp"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-navy-900 mb-1">Isi Konten Pesan *</label>
                <textarea
                  rows={8}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2.5 text-sm font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending || loadingEvent}
                  className="w-full rounded-2xl bg-gold-500 py-3.5 text-sm font-bold text-navy-950 hover:bg-gold-400 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Mengirim Campaign ke Server...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Kirim Campaign Broadcast Massal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Templates */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-navy-900 border-b border-border pb-3">
              Template Pesan Cepat
            </h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleApplyTemplate("reminder")}
                className="w-full text-left p-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/30 text-xs font-bold text-navy-900"
              >
                📅 Pengingat H-1 Event
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate("approved")}
                className="w-full text-left p-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/30 text-xs font-bold text-navy-900"
              >
                ✅ Pembayaran Berhasil & E-Ticket
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate("dresscode")}
                className="w-full text-left p-3 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/30 text-xs font-bold text-navy-900"
              >
                👔 Panduan Dresscode Venue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
