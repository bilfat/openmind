"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

type ValidationState = "loading" | "valid" | "expired" | "invalid";

// ─── Child component that uses useSearchParams ───────────────────────────────
function ZoomJoinContent() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get("s");
  const [state, setState] = useState<ValidationState>("loading");

  useEffect(() => {
    let active = true;

    const validateToken = async () => {
      if (!sessionToken || !sessionToken.startsWith("zs:")) {
        if (active) setState("invalid");
        return;
      }

      try {
        const res = await fetch('/api/check-in/zoom-status');
        const payload = await res.json();

        if (active) {
          if (payload.success && payload.data.sessionActive) {
            setState("valid");
          } else {
            setState("expired");
          }
        }
      } catch (err) {
        if (active) setState("invalid");
      }
    };

    validateToken();

    return () => { active = false; };
  }, [sessionToken]);

  return (
    /* Content based on state */
    <div className="relative z-10 bg-navy-950/50 rounded-2xl p-5 border border-navy-800 text-center">
      {state === "loading" && (
        <div className="py-6 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-gold-500/20 border-t-gold-500 animate-spin" />
          <p className="text-sm text-ivory-200/70">Memvalidasi session QR...</p>
        </div>
      )}

      {state === "valid" && (
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-2 justify-center text-emerald-400 mb-6">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-bold">Session QR Valid</span>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-ivory-100 mb-2">Cara Bergabung:</p>
            <div className="flex items-start gap-3 text-sm text-ivory-200/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
              <p>Buka <strong className="text-ivory-100">E-Tiket</strong> Anda melalui tombol di bawah.</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-ivory-200/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
              <p>Gulir ke bagian <strong className="text-blue-300">Akses Zoom (Online)</strong> di tiket Anda.</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-ivory-200/80">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
              <p>Klik <strong className="text-ivory-100">Scanner Kamera</strong> dan arahkan ke QR ini lagi.</p>
            </div>
          </div>
        </div>
      )}

      {state === "expired" && (
        <div className="py-4 flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <p className="font-bold text-amber-500">Session QR Kadaluarsa</p>
          <p className="text-xs text-ivory-200/60 text-center max-w-[250px]">
            QR ini sudah tidak berlaku. Mintalah QR baru dari panitia di grup WhatsApp.
          </p>
        </div>
      )}

      {state === "invalid" && (
        <div className="py-4 flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-full">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="font-bold text-red-500">Link Tidak Valid</p>
          <p className="text-xs text-ivory-200/60 text-center max-w-[250px]">
            Pastikan Anda memindai QR Code yang benar dari panitia OPEN MIND 2026.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Suspense fallback (loading state) ───────────────────────────────────────
function ZoomJoinFallback() {
  return (
    <div className="relative z-10 bg-navy-950/50 rounded-2xl p-5 border border-navy-800 text-center">
      <div className="py-6 flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-gold-500/20 border-t-gold-500 animate-spin" />
        <p className="text-sm text-ivory-200/70">Memuat...</p>
      </div>
    </div>
  );
}

// ─── Page shell (no useSearchParams here) ────────────────────────────────────
export default function ZoomJoinPage() {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-navy-800 bg-navy-900 shadow-2xl p-6 sm:p-8 space-y-8 relative overflow-hidden">

        {/* Decorative glows */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

        {/* Header */}
        <div className="text-center space-y-4 relative z-10">
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <img src="/logo-om.jpg" alt="OPEN MIND" className="h-8 w-8 rounded-md object-cover" />
              <span className="font-display text-lg font-bold tracking-wider text-ivory-100">OPEN MIND</span>
            </div>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-ivory-100">
              Akses Zoom Hybrid
            </h1>
            <p className="text-sm text-ivory-200/60 mt-1">
              OPEN MIND 2026
            </p>
          </div>
        </div>

        {/* Content wrapped in Suspense — required for useSearchParams() */}
        <Suspense fallback={<ZoomJoinFallback />}>
          <ZoomJoinContent />
        </Suspense>

        {/* Action Button */}
        <div className="relative z-10 pt-2">
          <Link
            href="/check-ticket"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gold-500 px-4 py-3.5 text-sm font-bold text-navy-950 transition-all hover:bg-gold-400"
          >
            Buka E-Tiket Saya <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="text-[10px] text-center text-ivory-200/40 mt-4 px-4">
            Halaman ini Khusus untuk peserta acara dengan tiket akses online.
          </p>
        </div>

      </div>
    </div>
  );
}
