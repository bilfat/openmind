"use client";

import { useEffect, useState } from "react";
import { eventData } from "@/data/event";
import { useActiveEvent } from "@/hooks/use-active-event";
import { getEventStartDate } from "@/lib/event-utils";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer() {
  const { event } = useActiveEvent();
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);
    const target = event?.event_date
      ? getEventStartDate(event).getTime()
      : new Date(eventData.dateISO).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const difference = Math.max(0, target - now);

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [event?.event_date, event?.start_time]);

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
