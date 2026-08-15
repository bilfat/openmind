import React from "react";
import { cn } from "@/lib/utils";

interface GoldDividerProps {
  className?: string;
  symbol?: string;
}

export function GoldDivider({ className, symbol = "✦" }: GoldDividerProps) {
  return (
    <div className={cn("flex items-center justify-center my-8 gap-4", className)}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
      <span className="text-gold-500 text-xs tracking-widest">{symbol}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
    </div>
  );
}
