"use client";

import React, { useState } from "react";
import {
  Lock,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";


interface PrivateLinkModalProps {
  ticketId: string;
  ticketName: string;
  privateToken: string;
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdated: (newToken: string) => void;
}

export function PrivateLinkModal({
  ticketId,
  ticketName,
  privateToken,
  isOpen,
  onClose,
  onTokenUpdated,
}: PrivateLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!isOpen) return null;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://openmind.id";
  const inviteUrl = `${origin}/invite/${privateToken}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const json = await res.json();
      if (json.success) {
        onTokenUpdated(json.data.token);
        setConfirmRegenerate(false);
      } else {
        setErrorMsg(json.message || "Gagal memperbarui token.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                PRIVATE ACCESS REGISTRATION
              </span>
              <h3 className="font-display text-lg font-bold text-navy-900">
                {ticketName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Link Box */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-navy-900">
            Tautan Pendaftaran Khusus (Private URL)
          </label>
          <div className="flex items-center gap-2 bg-secondary/30 rounded-2xl border border-border p-2">
            <span className="flex-1 truncate px-3 font-mono text-xs font-semibold text-navy-900">
              {inviteUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-gold-400 hover:bg-gold-500 hover:text-navy-950 transition-all shadow-sm active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Link</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Tiket ini tidak muncul di katalog publik. Bagikan link di atas secara privat kepada tamu atau delegasi yang berhak.
          </p>
        </div>

        {/* Regenerate Section */}
        {errorMsg && (
          <div className="rounded-2xl bg-destructive/15 border border-destructive/20 p-4 text-xs font-semibold text-destructive text-center">
            {errorMsg}
          </div>
        )}

        {!confirmRegenerate ? (
          <div className="rounded-2xl border border-border bg-secondary/20 p-4 flex items-center justify-between gap-4">
            <div>
              <strong className="block text-xs font-bold text-navy-900">
                Perbarui Token Link (Regenerate)
              </strong>
              <span className="text-[11px] text-muted-foreground">
                Gunakan jika link bocor atau ingin membatalkan akses lama.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmRegenerate(true)}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-bold text-navy-900 hover:border-gold-500 hover:text-gold-600 transition-colors shadow-sm whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Buat Baru</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <strong className="font-bold block">
                  Konfirmasi Pembuatan Link Baru?
                </strong>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Link sebelumnya (<code className="font-mono font-bold">/invite/{privateToken}</code>) akan otomatis menjadi <strong>tidak aktif</strong>. Peserta dengan link lama tidak akan bisa mendaftar.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmRegenerate(false)}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-navy-900"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm disabled:opacity-50"
              >
                {isRegenerating ? "Membuat..." : "Ya, Buat Link Baru"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-gold-600 hover:text-gold-500 font-bold underline"
          >
            <span>Buka Pratinjau Guest</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-secondary px-5 py-2 font-bold text-navy-900 hover:bg-secondary/80"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
