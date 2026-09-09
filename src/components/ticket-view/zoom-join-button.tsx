"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle2, Video, AlertCircle, Lock, MessageCircle } from "lucide-react";
import { useActiveEvent } from "@/hooks/use-active-event";
import { waLink, formatWhatsAppDisplay } from "@/lib/event-utils";
import { contactWhatsApp } from "@/data/social-links";

interface ZoomJoinButtonProps {
  zoomToken: string;
  zoomStatus: string;
  zoomAccessUnlocked?: boolean;
  participantName?: string;
  ticketCode?: string;
}

type JoinState =
  | "idle"
  | "loading"
  | "launching"
  | "success"
  | "already_used"
  | "expired"
  | "link_not_ready"
  | "access_closed"
  | "ticket_inactive"
  | "error";

/**
 * Launches the zoomus:// deep link.
 * Uses window.location.href which is required for mobile browsers.
 */
function launchZoomApp(deepLink: string) {
  window.location.href = deepLink;
}

export function ZoomJoinButton({
  zoomToken,
  zoomStatus,
  zoomAccessUnlocked = true,
  participantName,
  ticketCode,
}: ZoomJoinButtonProps) {
  const [state, setState] = useState<JoinState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const { event } = useActiveEvent();
  const waNumber = event?.contact_whatsapp || contactWhatsApp.number;
  const waDisplay =
    event?.contact_whatsapp_display ||
    formatWhatsAppDisplay(waNumber) ||
    contactWhatsApp.display;
  const waHref = waLink(waNumber) || `https://wa.me/${contactWhatsApp.number}`;

  const isLocked = zoomAccessUnlocked === false || state === "access_closed";

  const handleJoinZoom = async () => {
    if (isLocked) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/check-in/verify-zoom-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoomToken }),
      });
      const payload = await res.json();

      if (res.ok && payload.success && payload.data?.deepLink) {
        setState("launching");
        // Launch deep link — must happen in same call stack as user gesture
        launchZoomApp(payload.data.deepLink);
        // After 3s, mark as success
        setTimeout(() => setState("success"), 3000);
      } else {
        const reason = payload.reason || "error";
        setState(reason as JoinState);
        setErrorMsg(payload.message || "Gagal terhubung.");
      }
    } catch (err) {
      setState("error");
      setErrorMsg("Gagal terhubung. Coba beberapa saat lagi.");
    }
  };

  const isAlreadyUsed = zoomStatus === "USED" || state === "already_used";
  const isExpired = zoomStatus === "EXPIRED" || state === "expired";
  const isDisabled = isLocked || state === "loading" || state === "launching" || isAlreadyUsed || isExpired;

  return (
    <div className="space-y-3">
      <button
        id="zoom-join-direct-btn"
        onClick={handleJoinZoom}
        disabled={isDisabled}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-80 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
      >
        {isLocked ? (
          <>
            <Lock className="h-5 w-5 text-amber-300" /> AKSES ZOOM BELUM DIBUKA
          </>
        ) : state === "loading" ? (
          <>
            <Loader2 className="animate-spin h-5 w-5" /> Memverifikasi...
          </>
        ) : state === "launching" ? (
          <>
            <Loader2 className="animate-spin h-5 w-5" /> Membuka Aplikasi Zoom...
          </>
        ) : state === "success" || isAlreadyUsed ? (
          <>
            <CheckCircle2 className="text-emerald-400 h-5 w-5" /> Zoom Sedang Dibuka / Sudah Bergabung
          </>
        ) : isExpired ? (
          <>Token tidak berlaku lagi</>
        ) : (
          <>
            <Video className="h-5 w-5" /> JOIN ZOOM SEKARANG
          </>
        )}
      </button>

      {/* Info ketika akses Zoom masih dikunci oleh admin */}
      {isLocked && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300 leading-snug">
              Sesi Zoom belum dibuka oleh panitia. Akses akan otomatis dibuka pada hari H saat acara dimulai.
            </p>
          </div>
          <div className="pt-1 flex justify-center">
            <a
              href={`${waHref}?text=${encodeURIComponent(
                `Halo Panitia OPEN MIND, saya ${participantName || "Peserta"} ${
                  ticketCode ? `(Kode Tiket: ${ticketCode})` : ""
                } ingin bertanya mengenai jadwal Zoom.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors shadow-sm"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Hubungi Panitia via WhatsApp ({waDisplay})</span>
            </a>
          </div>
        </div>
      )}

      {/* Info ketika token sudah dipakai / sedang masuk zoom -> Selalu Tampilkan Hubungi Panitia */}
      {!isLocked && (isAlreadyUsed || state === "success" || state === "launching") && (
        <div className="rounded-xl bg-navy-900/90 border border-blue-500/30 p-3.5 space-y-2.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300 leading-snug">
              Token Zoom hanya dapat digunakan 1x. Jika kamu tidak sengaja keluar dari Zoom atau butuh reset akses, silakan hubungi panitia.
            </p>
          </div>

          <div className="pt-0.5 flex justify-center">
            <a
              href={`${waHref}?text=${encodeURIComponent(
                `Halo Panitia OPEN MIND, saya ${participantName || "Peserta"} ${
                  ticketCode ? `(Kode Tiket: ${ticketCode})` : ""
                } terkeluar dari Zoom / butuh bantuan reset token.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors shadow-sm"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span>Hubungi Panitia via WhatsApp ({waDisplay})</span>
            </a>
          </div>
        </div>
      )}

      {/* Error messages lainnya */}
      {!isLocked && errorMsg && !isAlreadyUsed && state !== "loading" && state !== "launching" && state !== "success" && (
        <p className="text-[11px] text-red-400 font-medium px-1 text-center">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
