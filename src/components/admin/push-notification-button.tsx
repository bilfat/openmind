"use client";

import { useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationButton() {
  const { pushState, enable, disable } = usePushNotifications();
  const [busy, setBusy] = useState(false);

  if (pushState === "unsupported") return null;

  const active = pushState === "subscribed" || pushState === "subscribing";
  const disabled = busy || pushState === "subscribing";

  async function handleClick() {
    setBusy(true);
    try {
      if (pushState === "subscribed") {
        await disable();
      } else {
        await enable();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={() => void handleClick()}
      disabled={disabled}
      className="relative rounded-lg p-2 text-navy-900/50 hover:text-navy-900 hover:bg-muted transition-colors disabled:opacity-60"
      aria-label={active ? "Matikan notifikasi HP" : "Aktifkan notifikasi HP"}
      title={active ? "Notifikasi HP aktif — klik untuk matikan" : "Aktifkan notifikasi HP"}
    >
      {busy || pushState === "subscribing" ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : active ? (
        <BellRing className="h-5 w-5 text-emerald-600" />
      ) : (
        <BellOff className="h-5 w-5" />
      )}
      {active && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />}
    </button>
  );
}