import {
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Banknote,
  ScanLine,
  Megaphone,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationType =
  | "ORDER_NEW"
  | "ORDER_APPROVED"
  | "ORDER_REJECTED"
  | "PAYMENT_RECEIVED"
  | "CHECK_IN"
  | "SYSTEM"
  | "BROADCAST";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ICON_STYLES: Record<NotificationType, string> = {
  ORDER_NEW: "bg-blue-50 text-blue-600",
  ORDER_APPROVED: "bg-emerald-50 text-emerald-600",
  ORDER_REJECTED: "bg-rose-50 text-rose-600",
  PAYMENT_RECEIVED: "bg-amber-50 text-amber-600",
  CHECK_IN: "bg-violet-50 text-violet-600",
  BROADCAST: "bg-gold-500/10 text-gold-600",
  SYSTEM: "bg-slate-100 text-slate-600",
};

export function notificationIconStyle(type: NotificationType): string {
  return ICON_STYLES[type] ?? ICON_STYLES.SYSTEM;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationTypeIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  const iconClass = "h-[18px] w-[18px]";
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
        notificationIconStyle(type),
        className
      )}
    >
      {type === "ORDER_NEW" && <ShoppingCart className={iconClass} />}
      {type === "ORDER_APPROVED" && <CheckCircle2 className={iconClass} />}
      {type === "ORDER_REJECTED" && <XCircle className={iconClass} />}
      {type === "PAYMENT_RECEIVED" && <Banknote className={iconClass} />}
      {type === "CHECK_IN" && <ScanLine className={iconClass} />}
      {type === "BROADCAST" && <Megaphone className={iconClass} />}
      {type === "SYSTEM" && <Info className={iconClass} />}
    </span>
  );
}

export function UnreadBadge({ count, className }: { count: number; className?: string }) {
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  if (safeCount === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white",
        className
      )}
    >
      {safeCount > 99 ? "99+" : safeCount}
    </span>
  );
}