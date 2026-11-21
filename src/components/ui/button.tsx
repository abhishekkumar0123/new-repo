"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const base = "font-mono inline-flex items-center justify-center gap-2 rounded-md border uppercase tracking-tighter transition-all disabled:pointer-events-none disabled:opacity-50";

  const variants = {
    primary: "bg-[#58d7f7] border-[#58d7f7]/40 text-[#061016] font-bold hover:bg-[#91e8fb] hover:border-[#58d7f7] active:scale-[0.97]",
    secondary: "bg-[#0d1218] border-white/[0.10] text-[#dfe7e3] hover:border-[#58d7f7]/30 hover:text-[#58d7f7] active:scale-[0.97]",
    outline: "border-[#58d7f7]/30 text-[#58d7f7] hover:border-[#58d7f7] hover:bg-[#58d7f7]/0.06 active:scale-[0.97]",
    ghost: "text-[#77847e] hover:text-[#58d7f7] hover:bg-white/[0.03] active:scale-[0.97]",
    destructive:
      "border-[#ff7b72]/30 text-[#ff7b72] hover:border-[#ff7b72] hover:bg-[#ff7b72]/0.06 active:scale-[0.97]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[9px] gap-1",
    md: "px-4 py-2 text-[10px] gap-2",
    lg: "px-6 py-3 text-[11px] gap-2.5",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin size-4 mr-1"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
}
