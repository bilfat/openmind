"use client";

import { useEffect, useState } from "react";
import { eventData } from "@/data/event";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => {
    const difference = Math.max(0, new Date(eventData.dateISO).getTime() - Date.now());
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
    };
  });

  useEffect(() => {
    const target = new Date(eventData.dateISO).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = Math.max(0, target - now);

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const timerItems = [
    { label: "DAYS", value: timeLeft.days },
    { label: "HOURS", value: timeLeft.hours },
    { label: "MINUTES", value: timeLeft.minutes },
    { label: "SECONDS", value: timeLeft.seconds },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-lg mx-auto">
      {timerItems.map((item) => (
        <div
          key={item.label}
          className="group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-gold-500/30 bg-navy-950/70 backdrop-blur-md hover:border-gold-500 transition-all duration-300 shadow-lg shadow-black/40"
        >
          {/* Subtle corner ornament accent */}
          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-gold-500/50" />
          
          <span className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-ivory-100 to-gold-400">
            {String(item.value).padStart(2, "0")}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-gold-500 uppercase mt-1">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
