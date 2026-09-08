import React from "react";
import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ZoomStatsCardsProps {
  stats?: {
    totalWithZoomAccess: number;
    totalUsed: number;
    totalPending: number;
    totalExpired: number;
  };
  loading?: boolean;
}

export function ZoomStatsCards({ stats, loading }: ZoomStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard
        icon={Users}
        label="Total Akses Zoom"
        value={stats?.totalWithZoomAccess}
        loading={loading}
        color="blue"
      />
      <StatCard
        icon={CheckCircle2}
        label="Sudah Join"
        value={stats?.totalUsed}
        loading={loading}
        color="emerald"
      />
      <StatCard
        icon={Clock}
        label="Belum Join"
        value={stats?.totalPending}
        loading={loading}
        color="amber"
      />
      <StatCard
        icon={AlertCircle}
        label="Token Expired"
        value={stats?.totalExpired}
        loading={loading}
        color="red"
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  color,
}: {
  icon: any;
  label: string;
  value?: number;
  loading?: boolean;
  color: "blue" | "emerald" | "amber" | "red";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm flex flex-col justify-between h-[110px]">
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-lg border", colors[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-navy-900/70">
          {label}
        </p>
      </div>
      <div>
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded-lg bg-secondary mt-1"></div>
        ) : (
          <p className="font-display text-2xl sm:text-3xl font-bold text-navy-900">
            {value ?? 0}
          </p>
        )}
      </div>
    </div>
  );
}
