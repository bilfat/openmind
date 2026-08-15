"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
  isFree?: boolean;
}

export function StepIndicator({ currentStep, isFree = false }: StepIndicatorProps) {
  const steps = [
    { number: 1, title: "01 Informasi Peserta" },
    { number: 2, title: isFree ? "02 Konfirmasi Gratis" : "02 Pembayaran" },
    { number: 3, title: "03 Selesai & E-Ticket" },
  ];

  return (
    <div className="mx-auto max-w-2xl py-6 px-4">
      <div className="relative flex items-center justify-between">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-border -z-0" />

        {/* Progress Colored Line */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-gold-500 transition-all duration-500 -z-0"
          style={{
            width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%",
          }}
        />

        {steps.map((step) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;

          return (
            <div key={step.number} className="relative z-10 flex flex-col items-center">
              <div
                className={cn(
                  "flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all duration-300 border-2",
                  isCompleted &&
                    "bg-gold-500 border-gold-500 text-navy-950 shadow-md shadow-gold-500/20",
                  isCurrent &&
                    "bg-navy-900 border-gold-500 text-gold-400 shadow-lg shadow-gold-500/20 ring-4 ring-gold-500/15",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-white border-border text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  <span>0{step.number}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-[11px] sm:text-xs font-semibold text-center tracking-tight",
                  isCurrent ? "text-navy-900 font-bold" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
