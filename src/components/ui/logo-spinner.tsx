"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoSpinnerProps = {
  size?: number;
  className?: string;
  showGlow?: boolean;
};

export function LogoSpinner({ size = 40, className, showGlow = true }: LogoSpinnerProps) {
  const logoSize = Math.round(size * 0.72);
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {showGlow && (
        <div className="absolute inset-0 rounded-full bg-gold-500/10 blur-xl animate-pulse" />
      )}

      {/* Outer rotating ring */}
      <div
        className="absolute inset-0 rounded-full p-[2px] animate-spin"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, transparent 35deg, rgba(234,179,8,0.15) 80deg, #eab308 150deg, #facc15 200deg, rgba(234,179,8,0.15) 260deg, transparent 320deg)",
          animationDuration: "1.8s",
        }}
      >
        <div className="h-full w-full rounded-full bg-navy-950" />
      </div>

      {/* Logo container */}
      <div
        className="relative z-10 flex items-center justify-center overflow-hidden rounded-full border border-gold-500/40 bg-navy-900 shadow-[0_0_30px_rgba(234,179,8,0.18)]"
        style={{ width: logoSize, height: logoSize }}
      >
        <Image
          src="/logo-om.jpg"
          alt="OPEN MIND"
          width={logoSize}
          height={logoSize}
          className="h-full w-full rounded-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-white/5" />
      </div>
    </div>
  );
}