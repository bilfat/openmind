import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  badge?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left" | "right";
  className?: string;
  dark?: boolean;
}

export function SectionHeading({
  badge,
  title,
  subtitle,
  align = "center",
  className,
  dark = false,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-3",
        align === "center" && "text-center mx-auto max-w-3xl",
        align === "left" && "text-left",
        align === "right" && "text-right ml-auto",
        className
      )}
    >
      {badge && (
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em]",
            dark
              ? "bg-gold-500/10 text-gold-400 border border-gold-500/30"
              : "bg-gold-500/10 text-gold-500 border border-gold-500/20"
          )}
        >
          <span>✦</span>
          <span>{badge}</span>
        </div>
      )}
      <h2
        className={cn(
          "font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight",
          dark ? "text-ivory-100" : "text-navy-900"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "text-base sm:text-lg leading-relaxed max-w-2xl",
            align === "center" && "mx-auto",
            dark ? "text-ivory-200/70" : "text-navy-900/60"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
