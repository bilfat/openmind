"use client";

import { useState } from "react";
import { BellRing, BellOff, Loader2, Smartphone, CheckCircle2, Download } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";

export function PushNotificationCard() {
  const { pushState, error, enable, disable } = usePushNotifications();
  const [busy, setBusy] = useState(false);

  async function handleEnable() {
    setBusy(true);
    try {
      await enable();
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      await disable();
    } finally {
      setBusy(false);
    }
  }

  const isActive = pushState === "subscribed";
  const isBusy = busy || pushState === "subscribing";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        isActive ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-border bg-white"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
          )}
        >
          {isActive ? <CheckCircle2 className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy-900">
            {isActive ? "Notifikasi HP aktif" : "Notifikasi HP"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isActive
              ? "Notifikasi baru akan muncul di perangkat Anda meskipun tab tertutup."
              : "Aktifkan agar notifikasi baru muncul di HP Anda meskipun aplikasi tidak terbuka."}
          </p>

          {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

          {pushState === "unsupported" ? (
            <p className="mt-2 text-xs text-amber-600">
              Browser Anda tidak mendukung web push. Gunakan Chrome/Edge (Android) atau Safari (iOS).
            </p>
          ) : pushState === "denied" ? (
            <p className="mt-2 text-xs text-amber-600">
              Izin notifikasi ditolak. Buka pengaturan situs di browser untuk mengizinkan notifikasi.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isActive ? (
                <button
                  onClick={() => void handleDisable()}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary/40 transition-colors disabled:opacity-50"
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                  Matikan
                </button>
              ) : (
                <button
                  onClick={() => void handleEnable()}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition-colors disabled:opacity-50"
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                  {isBusy ? "Mengaktifkan..." : "Aktifkan Notifikasi"}
                </button>
              )}

              {pushState === "idle" && (
                <button
                  onClick={() => void handleEnable()}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary/40 transition-colors disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Aktifkan
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!isActive && pushState !== "unsupported" && pushState !== "denied" && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground">
          <li>• Buka situs ini lewat HP (wajib HTTPS saat sudah di-deploy ke Vercel).</li>
          <li>• Pasang ke layar utama: menu browser → &quot;Add to Home Screen&quot; (iOS) / &quot;Install app&quot; (Chrome).</li>
          <li>• Klik &quot;Aktifkan Notifikasi&quot; dan izinkan permintaan izin browser.</li>
          <li>• Pastikan HP tidak dalam mode DND agar bunyi notifikasi muncul.</li>
        </ul>
      )}
    </div>
  );
}