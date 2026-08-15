import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        "shimmer",
        className
      )}
      aria-hidden="true"
    />
  );
}

/* Preset skeletons */
export function TalentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function TicketCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <Skeleton className="h-6 w-2/3" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="mt-6">
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-navy-950 px-6">
      <div className="text-center">
        <Skeleton className="mx-auto h-4 w-32 rounded-full bg-navy-800" />
        <Skeleton className="mx-auto mt-6 h-12 w-96 bg-navy-800" />
        <Skeleton className="mx-auto mt-4 h-4 w-64 bg-navy-800" />
        <Skeleton className="mx-auto mt-8 h-12 w-40 rounded-full bg-gold-500/20" />
      </div>
    </div>
  );
}
