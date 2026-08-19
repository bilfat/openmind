"use client";

import React, { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface PaymentCountdownProps {
  deadline: number;
  onExpired?: () => void;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

export function PaymentCountdown({ deadline, onExpired }: PaymentCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ hours: 0, minutes: 0, seconds: 0 });
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, deadline - Date.now());
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
      if (diff <= 0) onExpiredRef.current?.();
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const items = [
    { label: "Jam", value: timeLeft.hours },
    { label: "Menit", value: timeLeft.minutes },
    { label: "Detik", value: timeLeft.seconds },
  ];

  return (
    <div className="rounded-3xl border border-gold-500/30 bg-navy-950 p-5 sm:p-6 text-ivory-100 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gold-400">
              Batas Waktu Pembayaran
            </p>
            <p className="text-[11px] sm:text-xs text-ivory-200/70">
              Selesaikan pembayaran dan unggah bukti sebelum waktu habis. Setelah lewat, pesanan otomatis kadaluarsa.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && (
                <span className="text-xl sm:text-2xl font-black text-gold-500 -mt-3">:</span>
              )}
              <div className="flex min-w-[68px] sm:min-w-[80px] flex-col items-center justify-center rounded-xl border border-gold-500/25 bg-navy-900/80 px-3 py-2">
                <span className="font-display text-2xl sm:text-3xl font-black tabular-nums text-gold-400">
                  {String(item.value).padStart(2, "0")}
                </span>
                <span className="mt-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-ivory-200/60">
                  {item.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}