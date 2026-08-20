"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/toast";
import type { AdminNotification } from "@/components/admin/notification-shared";

const PAGE_SIZE = 50;
const FALLBACK_REFRESH_MS = 30000;

function showBrowserNotification(record: AdminNotification) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const notification = new Notification(record.title, {
      body: record.message,
      icon: "/icon.jpg",
      badge: "/icon.jpg",
      tag: `openmind-${record.id}`,
      data: { url: record.link || "/admin/notifications" },
    });
    notification.onclick = () => {
      window.focus();
      const url = record.link || "/admin/notifications";
      if (url.startsWith("/")) {
        window.location.href = url;
      }
    };
  } catch (err) {
    console.error("Browser notification failed:", err);
  }
}

interface FetchNotificationsResponse {
  items: AdminNotification[];
  unread_count: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface NotificationContextType {
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const toast = useToast();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const nextPageRef = useRef(1);
  const totalPagesRef = useRef(0);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (page: number): Promise<FetchNotificationsResponse | null> => {
      try {
        const res = await fetch(`/api/admin/notifications?page=${page}&limit=${PAGE_SIZE}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.message || "Gagal memuat notifikasi.");
          return null;
        }
        setError(null);
        return json as FetchNotificationsResponse;
      } catch {
        setError("Gagal memuat notifikasi. Periksa koneksi Anda.");
        return null;
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    const pageData = await fetchPage(1);
    if (!pageData) return;
    setNotifications(pageData.items);
    setUnreadCount(pageData.unread_count);
    nextPageRef.current = 2;
    totalPagesRef.current = pageData.pagination.totalPages;
    setHasMore(pageData.pagination.totalPages > 1);
  }, [fetchPage]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      const pageData = await fetchPage(1);
      if (!mounted) return;
      if (pageData) {
        setNotifications(pageData.items);
        setUnreadCount(pageData.unread_count);
        nextPageRef.current = 2;
        totalPagesRef.current = pageData.pagination.totalPages;
        setHasMore(pageData.pagination.totalPages > 1);
      }
      setLoading(false);
    }

    init();

    return () => {
      mounted = false;
    };
  }, [fetchPage]);

  // Realtime subscription — single source of truth for live inserts/updates
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;
      const userId = user.id;

      const topic = `realtime:notifications_${userId}`;
      supabase
        .getChannels()
        .filter((c) => c.topic === topic)
        .forEach((c) => supabase.removeChannel(c));

      channel = supabase
        .channel(`notifications_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `profile_id=eq.${userId}`,
          },
          (payload) => {
            const record = payload.new as AdminNotification;
            setNotifications((prev) => {
              if (prev.some((n) => n.id === record.id)) return prev;
              return [record, ...prev];
            });
            if (!record.is_read) {
              setUnreadCount((prev) => prev + 1);
            }
            showBrowserNotification(record);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `profile_id=eq.${userId}`,
          },
          (payload) => {
            const record = payload.new as AdminNotification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === record.id ? { ...n, ...record } : n))
            );
            setUnreadCount((prev) => {
              const oldRecord = payload.old as Partial<AdminNotification>;
              const wasRead = oldRecord?.is_read === true;
              const isNowRead = record.is_read === true;
              if (wasRead && !isNowRead) return prev + 1;
              if (!wasRead && isNowRead) return Math.max(0, prev - 1);
              return prev;
            });
          }
        )
        .subscribe();

      interval = setInterval(() => {
        if (!loadingRef.current) {
          void refresh();
        }
      }, FALLBACK_REFRESH_MS);
    })();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [supabase, refresh]);

  const markAsRead = useCallback(
    async (id: string) => {
      const snapshotNotifications = notifications;
      const snapshotUnread = unreadCount;

      const target = notifications.find((n) => n.id === id);
      if (!target || target.is_read) return;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        const res = await fetch(`/api/admin/notifications/${id}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal menandai notifikasi.");
        }
      } catch {
        // Rollback optimistic state on failure
        setNotifications(snapshotNotifications);
        setUnreadCount(snapshotUnread);
        toast.error("Gagal menandai notifikasi sudah dibaca.");
      }
    },
    [notifications, unreadCount, toast]
  );

  const markAllAsRead = useCallback(async () => {
    const snapshotNotifications = notifications;
    const snapshotUnread = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const res = await fetch("/api/admin/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal menandai semua notifikasi.");
      }
    } catch {
      // Rollback optimistic state on failure
      setNotifications(snapshotNotifications);
      setUnreadCount(snapshotUnread);
      toast.error("Gagal menandai semua notifikasi sudah dibaca.");
    }
  }, [notifications, unreadCount, toast]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    if (nextPageRef.current > totalPagesRef.current) return;

    loadingRef.current = true;
    try {
      const pageData = await fetchPage(nextPageRef.current);
      if (!pageData) return;
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const fresh = pageData.items.filter((n) => !existingIds.has(n.id));
        return [...prev, ...fresh];
      });
      nextPageRef.current += 1;
      setHasMore(pageData.pagination.totalPages >= nextPageRef.current);
    } finally {
      loadingRef.current = false;
    }
  }, [fetchPage]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        hasMore,
        markAsRead,
        markAllAsRead,
        refresh,
        loadMore,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}