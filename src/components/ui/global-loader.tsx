"use client";

import { useEffect, useState } from "react";
import { LogoSpinner } from "./logo-spinner";

export function GlobalLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-navy-950">
      {/* Ambient glow */}
      <div className="absolute h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />

      {/* Loader */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        <LogoSpinner size={128} />

        {/* Small orbiting dot */}
        <div
          className="absolute inset-[-7px] animate-spin rounded-full"
          style={{ animationDuration: "2.8s" }}
        >
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-gold-400 shadow-[0_0_10px_rgba(250,204,21,0.9)]" />
        </div>
      </div>

      {/* Brand */}
      <div className="relative mt-7 flex flex-col items-center">
        <p className="font-display text-lg font-bold uppercase tracking-[0.35em] text-gold-500">
          OPEN MIND
        </p>

        <div className="mt-3 h-px w-12 bg-gradient-to-r from-transparent via-gold-500/70 to-transparent" />

        <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.45em] text-ivory-200/40">
          2026
        </p>
      </div>
    </div>
  );
}