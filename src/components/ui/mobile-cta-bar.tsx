"use client";

import Link from "next/link";
import { Ticket } from "lucide-react";

export function MobileCtaBar() {
  return (
    <div className="mobile-cta-bar" role="complementary" aria-label="Aksi cepat">
      <Link
        href="/tiket"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-500 px-6 py-3 text-sm font-bold text-navy-950 transition-all hover:bg-gold-400 active:scale-95 w-full touch-target"
      >
        <Ticket className="h-4 w-4" aria-hidden="true" />
        <span>Beli Tiket Sekarang</span>
      </Link>
    </div>
  );
}
