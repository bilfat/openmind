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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-navy-950 transition-opacity duration-500">
      {/* Gold spinner ring */}
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-navy-800" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-gold-500" />
        <img
          src="/logo-om.jpg"
          alt="OPEN MIND"
          className="absolute inset-2 h-auto w-auto rounded-md object-cover"
        />
      </div>
      <p className="mt-6 font-display text-lg font-bold tracking-widest text-gold-500 uppercase">
        OPEN MIND
      </p>
      <p className="mt-1 text-xs tracking-[0.3em] text-ivory-200/50">
        2026
      </p>
    </div>
  );
}
