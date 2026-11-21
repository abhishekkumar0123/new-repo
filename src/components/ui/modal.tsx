"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeOnOverlayClick = true,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        className="relative w-full max-w-2xl mx-auto p-5 lg:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-panel rounded-xl border border-white/[0.08] p-6 lg:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.40)]">
          {title && (
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#58d7f7]">
                  {title}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-[#77847e] hover:text-white hover:bg-white/[0.05] transition-colors"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
