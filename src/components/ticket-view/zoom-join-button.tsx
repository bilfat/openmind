"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle2, Video, AlertCircle } from "lucide-react";

interface ZoomJoinButtonProps {
  zoomToken: string;
  zoomStatus: string;
}

type JoinState =
  | "idle"
  | "loading"
  | "launching"
  | "success"
  | "already_used"
  | "expired"
  | "link_not_ready"
  | "ticket_inactive"
  | "error";

/**
 * Launches the zoommtg:// deep link to open Zoom app directly.
 * No HTTPS URL is ever shown in the browser address bar.
 */
function launchZoomApp(deepLink: string) {
  // Create hidden iframe to trigger deep link (prevents page navigation)
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  iframe.src = deepLink;
  // Clean up iframe after a short delay
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);
}

export function ZoomJoinButton({ zoomToken, zoomStatus }: ZoomJoinButtonProps) {
  const [state, setState] = useState<JoinState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleJoinZoom = async () => {
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
        // Launch via deep link — Zoom URL never visible in browser address bar
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
  const isDisabled = state === "loading" || state === "launching" || isAlreadyUsed || isExpired;

  return (
    <div className="space-y-2">
      <button
        id="zoom-join-direct-btn"
        onClick={handleJoinZoom}
        disabled={isDisabled}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-500 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
      >
        {state === "loading" ? (
          <>
            <Loader2 className="animate-spin h-5 w-5" /> Memverifikasi...
          </>
        ) : state === "launching" ? (
          <>
            <Loader2 className="animate-spin h-5 w-5" /> Membuka Aplikasi Zoom...
          </>
        ) : state === "success" ? (
          <>
            <CheckCircle2 className="text-emerald-400 h-5 w-5" /> Zoom Sedang Dibuka
          </>
        ) : isAlreadyUsed ? (
          <>
            <CheckCircle2 className="text-emerald-400 h-5 w-5" /> Sudah Bergabung
          </>
        ) : isExpired ? (
          <>Token tidak berlaku lagi</>
        ) : (
          <>
            <Video className="h-5 w-5" /> JOIN ZOOM SEKARANG
          </>
        )}
      </button>

      {/* Error: already_used — beri info hubungi panitia */}
      {(state === "already_used" || (zoomStatus === "USED" && state === "idle")) && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300 leading-snug">
            Token sudah dipakai. Jika kamu tidak sengaja kelempar dari Zoom, hubungi panitia untuk reset akses.
          </p>
        </div>
      )}

      {/* Error messages lainnya */}
      {state !== "idle" && state !== "loading" && state !== "launching" && state !== "success" && state !== "already_used" && errorMsg && (
        <p className="text-[11px] text-red-400 font-medium px-1 text-center">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
