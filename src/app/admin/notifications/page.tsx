"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCheck, Loader2, RefreshCw, AlertCircle, Bell } from "lucide-react";
import { useNotifications } from "@/components/admin/notification-provider";
import {
  AdminNotification,
  NotificationTypeIcon,
  formatTimestamp,
} from "@/components/admin/notification-shared";
import { cn } from "@/lib/utils";

type TabFilter = "ALL" | "UNREAD" | "READ";

const TABS: { key: TabFilter; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "UNREAD", label: "Belum Dibaca" },
  { key: "READ", label: "Sudah Dibaca" },
];

export default function AdminNotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    refresh,
    loadMore,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [loadingMore, setLoadingMore] = useState(false);

  const filtered = useMemo(() => {
    if (activeTab === "UNREAD") return notifications.filter((n) => !n.is_read);
    if (activeTab === "READ") return notifications.filter((n) => n.is_read);
    return notifications;
  }, [notifications, activeTab]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      await loadMore();
    } finally {
      setLoadingMore(false);
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.is_read) {
      void markAsRead(notification.id);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-600 border border-gold-500/20 mb-2">
            <Bell className="h-3.5 w-3.5" />
            <span>NOTIFICATION CENTER</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900">Notifikasi</h1>
          <p className="text-xs sm:text-sm text-navy-900/70">
            Pusat notifikasi aktivitas pesanan, pembayaran, check-in, dan broadcast.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllAsRead()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary/40 transition-colors"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" />
              Tandai Semua Dibaca
            </button>
          )}
          <button
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-secondary/40 transition-colors"
            aria-label="Refresh notifications"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors",
              activeTab === tab.key
                ? "bg-navy-900 text-white"
                : "text-navy-900/60 hover:bg-secondary/40"
            )}
          >
            {tab.label}
            {tab.key === "UNREAD" && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-white py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
          <p className="text-sm text-muted-foreground">Memuat notifikasi...</p>
        </div>
      ) : error && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-white py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <AlertCircle className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-navy-900">Gagal memuat notifikasi</p>
          <p className="text-xs text-muted-foreground max-w-sm text-center">{error}</p>
          <button
            onClick={() => void refresh()}
            className="mt-1 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba Lagi
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-white py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bell className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-navy-900">
            {activeTab === "ALL"
              ? "Belum ada notifikasi"
              : activeTab === "UNREAD"
                ? "Semua notifikasi sudah dibaca"
                : "Belum ada notifikasi yang dibaca"}
          </p>
          <p className="text-xs text-muted-foreground">
            {activeTab === "UNREAD" ? "Anda tidak memiliki notifikasi yang belum dibaca." : "Notifikasi baru akan muncul di sini."}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {filtered.map((notification) => (
              <li key={notification.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-4 rounded-2xl border p-4 text-left transition-all",
                    notification.is_read
                      ? "border-border bg-white"
                      : "border-orange-500/30 bg-orange-500/[0.04] shadow-sm"
                  )}
                >
                  <NotificationTypeIcon type={notification.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          notification.is_read ? "text-navy-900/80" : "text-navy-900"
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="shrink-0 text-[10px] text-muted-foreground/70">
                        {formatTimestamp(notification.created_at)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                    {notification.link && (
                      <span className="mt-2 inline-block text-[11px] font-semibold text-gold-600">
                        <Link href={notification.link} onClick={(e) => e.stopPropagation()}>
                          Lihat Detail →
                        </Link>
                      </span>
                    )}
                  </div>
                  {!notification.is_read && (
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
                  )}
                </div>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-xs font-semibold text-navy-900 hover:bg-secondary/40 transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {loadingMore ? "Memuat..." : "Muat Lebih Banyak"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}