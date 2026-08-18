"use client";

import { useEffect, useState } from "react";

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
        {/* Outer subtle glow */}
        <div className="absolute inset-0 rounded-full bg-gold-500/10 blur-xl animate-pulse" />

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

        {/* Inner ring */}
        <div
          className="absolute inset-2 rounded-full border border-gold-500/20"
          style={{
            boxShadow:
              "inset 0 0 20px rgba(234,179,8,0.08), 0 0 20px rgba(234,179,8,0.08)",
          }}
        />

        {/* Logo container */}
        <div className="relative z-10 flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-full border border-gold-500/40 bg-navy-900 shadow-[0_0_30px_rgba(234,179,8,0.18)]">
          <img
            src="/logo-om.jpg"
            alt="OPEN MIND"
            className="h-full w-full rounded-full object-cover"
          />

          {/* Soft logo overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-full bg-white/5" />
        </div>

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