"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Check, AlertCircle, AlertTriangle, Info, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => string;
    error: (message: string, duration?: number) => string;
    warning: (message: string, duration?: number) => string;
    info: (message: string, duration?: number) => string;
    loading: (message: string) => { id: string; dismiss: () => void };
    dismiss: (id: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context.toast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, duration }]);

    if (type !== "loading" && duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  }, [dismiss]);

  const toast = React.useMemo(() => ({
    success: (message: string, duration?: number) => addToast("success", message, duration),
    error: (message: string, duration?: number) => addToast("error", message, duration),
    warning: (message: string, duration?: number) => addToast("warning", message, duration),
    info: (message: string, duration?: number) => addToast("info", message, duration),
    loading: (message: string) => {
      const id = addToast("loading", message, 0);
      return {
        id,
        dismiss: () => dismiss(id),
      };
    },
    dismiss,
  }), [addToast, dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            id={`toast-${t.id}`}
            className={cn(
              "flex items-center gap-3 w-full p-4 rounded-2xl border shadow-lg pointer-events-auto transition-all duration-300 animate-slide-in-right",
              t.type === "success" && "bg-emerald-50 text-emerald-800 border-emerald-200",
              t.type === "error" && "bg-rose-50 text-rose-800 border-rose-200",
              t.type === "warning" && "bg-amber-50 text-amber-800 border-amber-200",
              t.type === "info" && "bg-blue-50 text-blue-800 border-blue-200",
              t.type === "loading" && "bg-navy-900 text-white border-navy-800"
            )}
          >
            <div className="shrink-0">
              {t.type === "success" && <Check className="h-5 w-5 text-emerald-600" />}
              {t.type === "error" && <AlertCircle className="h-5 w-5 text-rose-600" />}
              {t.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {t.type === "info" && <Info className="h-5 w-5 text-blue-600" />}
              {t.type === "loading" && <Loader2 className="h-5 w-5 text-gold-500 animate-spin" />}
            </div>
            <p className="text-xs font-semibold flex-1 leading-relaxed">{t.message}</p>
            {t.type !== "loading" && (
              <button
                onClick={() => dismiss(t.id)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
