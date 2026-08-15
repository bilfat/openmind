import { cn } from "@/lib/utils";
import { PackageOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/10">
        <Icon className="h-8 w-8 text-gold-500" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-navy-900">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-navy-900/60">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
