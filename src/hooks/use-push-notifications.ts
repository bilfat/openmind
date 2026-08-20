"use client";

import { useCallback, useEffect, useState } from "react";

export type PushState =
  | "unsupported"
  | "idle"
  | "denied"
  | "subscribing"
  | "subscribed"
  | "error";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const SW_PATH = "/sw.js";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getOrRegisterSw(): Promise<ServiceWorkerRegistration | null> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

async function syncExistingSubscription(
  registration: ServiceWorkerRegistration
): Promise<PushState> {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
      return res.ok ? "subscribed" : "idle";
    }
  } catch (err) {
    console.error("Sync push subscription failed:", err);
  }
  return "idle";
}

export function usePushNotifications() {
  const [pushState, setPushState] = useState<PushState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!isSupported()) {
        if (mounted) setPushState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        if (mounted) setPushState("denied");
        return;
      }

      if (Notification.permission !== "granted") {
        if (mounted) setPushState("idle");
        return;
      }

      if (mounted) setPushState("subscribing");
      try {
        const reg = await getOrRegisterSw();
        if (!mounted) return;
        if (!reg) {
          setPushState("unsupported");
          return;
        }
        const state = await syncExistingSubscription(reg);
        if (mounted) setPushState(state);
      } catch (err) {
        console.error("Push init failed:", err);
        if (mounted) setPushState("error");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!isSupported()) {
      setPushState("unsupported");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "idle");
        return false;
      }

      setPushState("subscribing");
      const registration = await getOrRegisterSw();
      if (!registration) {
        setPushState("unsupported");
        return false;
      }

      if (!VAPID_PUBLIC_KEY) {
        setError("Kunci VAPID belum dikonfigurasi pada server.");
        setPushState("error");
        return false;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Gagal menyimpan langganan push.");
      }

      setPushState("subscribed");
      return true;
    } catch (err: unknown) {
      console.error("Enable push failed:", err);
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengaktifkan notifikasi."
      );
      setPushState("error");
      return false;
    }
  }, []);

  const disable = useCallback(async (): Promise<void> => {
    try {
      if (isSupported()) {
        const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await fetch(
            `/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`,
            { method: "DELETE" }
          );
          await subscription.unsubscribe();
        }
      }
      setPushState("idle");
    } catch (err) {
      console.error("Disable push failed:", err);
      setError("Gagal menonaktifkan notifikasi.");
    }
  }, []);

  return { pushState, error, enable, disable };
}