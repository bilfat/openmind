"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  confirmValue?: string; // Optional typed confirmation string
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  isDestructive = true,
  onConfirm,
  onClose,
  confirmValue,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (confirmValue && typedValue !== confirmValue) return;
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      setTypedValue("");
    }
  };

  const isConfirmDisabled = isLoading || (confirmValue ? typedValue !== confirmValue : false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-center animate-scale-in">
        <div className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-2",
          isDestructive ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
        )}>
          <AlertTriangle className="h-6 w-6 animate-pulse" />
        </div>
        
        <h3 className="font-display text-base font-bold text-navy-900">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        
        {confirmValue && (
          <div className="text-left space-y-1">
            <label className="text-[10px] font-bold text-navy-900 uppercase tracking-wider">
              Ketik <span className="font-mono bg-secondary/50 px-1 py-0.5 rounded text-rose-600">{confirmValue}</span> untuk mengonfirmasi
            </label>
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              className="w-full rounded-xl border bg-secondary/20 px-3.5 py-2 text-xs h-9 focus:ring-1 focus:ring-rose-500 outline-none"
              placeholder={confirmValue}
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setTypedValue("");
              onClose();
            }}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold text-navy-900 hover:bg-secondary/20 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={cn(
              "flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition-all flex items-center justify-center gap-2",
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400"
                : "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400"
            )}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
