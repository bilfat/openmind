"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Loader2, ChevronRight } from "lucide-react";
import { useNotifications } from "@/components/admin/notification-provider";
import {
  AdminNotification,
  NotificationTypeIcon,
  UnreadBadge,
  formatRelativeTime,
} from "@/components/admin/notification-shared";
import { cn } from "@/lib/utils";

export function NotificationDropdown() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Latest 5 notifications, unread first
  const latest = [...notifications]
    .sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 5);

  const handleNotificationClick = (notification: AdminNotification) => {
    setOpen(false);
    if (!notification.is_read) {
      void markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-navy-900/50 hover:text-navy-900 hover:bg-muted transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        <UnreadBadge
          count={unreadCount}
          className="absolute right-1 top-1 min-w-[16px] px-1 text-[9px]"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 overflow-hidden rounded-2xl border border-border bg-white shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-navy-900">Notifikasi</p>
            {unreadCount > 0 && (
              <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                {unreadCount} belum dibaca
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat notifikasi...
              </div>
            ) : latest.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-navy-900">Belum ada notifikasi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Notifikasi baru akan muncul di sini.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {latest.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40",
                        !notification.is_read && "bg-orange-500/[0.04]"
                      )}
                    >
                      <NotificationTypeIcon type={notification.type} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-navy-900">{notification.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/70">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/admin/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-border px-4 py-3 text-xs font-semibold text-gold-600 hover:bg-secondary/40 transition-colors"
          >
            Lihat Semua Notifikasi
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}