"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const showToast = React.useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = ++toastId;
      const newToast: ToastItem = {
        id: String(id),
        type: toast.type,
        title: toast.title,
        message: toast.message,
        duration: toast.duration ?? 4000,
      };
      setToasts((prev) => [...prev, newToast]);

      const effectiveDuration = newToast.duration ?? 0;
      if (effectiveDuration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, effectiveDuration);
      }
    },
    [],
  );

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const typeIcons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={16} className="text-[#00ff91]" />,
    error: <AlertCircle size={16} className="text-[#ff7b72]" />,
    warning: <AlertCircle size={16} className="text-[#ffca8a]" />,
    info: <X size={16} className="text-[#58d7f7]" />,
  };

  const typeColors: Record<ToastType, string> = {
    success: "#00ff91",
    error: "#ff7b72",
    warning: "#ffca8a",
    info: "#58d7f7",
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[70] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-md border p-4 min-w-[300px] shadow-[0_24px_64px_rgba(0,0,0,0.40)]",
              toast.type === "success"
                ? "border-[#00ff91]/25 bg-[#00ff91]/[0.05] text-[#dfe7e3]"
                : toast.type === "error"
                ? "border-[#ff7b72]/25 bg-[#ff7b72]/[0.05] text-[#dfe7e3]"
                : toast.type === "warning"
                ? "border-[#ffca8a]/25 bg-[#ffca8a]/[0.05] text-[#dfe7e3]"
                : "border-[#58d7f7]/25 bg-[#58d7f7]/[0.05] text-[#dfe7e3]",
              "animate-in slide-in-from-right duration-300",
            )}
          >
            <span className={cn("shrink-0", typeColors[toast.type])}>
              {typeIcons[toast.type]}
            </span>
            <div className="flex-1">
              <p className="font-mono text-xs font-semibold text-[#dfe7e3]">
                {toast.title}
              </p>
              {toast.message && (
                <p className="font-mono text-[9px] text-[#9ba8a1] mt-0.5">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="ml-2 p-1 text-[#77847e] hover:text-white hover:bg-white/[0.05] rounded"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
