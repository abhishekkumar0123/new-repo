"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "critical"
    | "high"
    | "medium"
    | "low";
  size?: "sm" | "md";
}

const variantStyles: Record<string, string> = {
  default: "border-white/[0.10] bg-white/[0.04] text-[#9ba8a1]",
  secondary: "border-[#58d7f7]/30 bg-[#58d7f7]/[0.05] text-[#58d7f7]",
  success: "border-[#00ff91]/30 bg-[#00ff91]/[0.05] text-[#00ff91]",
  warning: "border-[#ffca8a]/30 bg-[#ffca8a]/[0.05] text-[#ffca8a]",
  danger: "border-[#ff7b72]/30 bg-[#ff7b72]/[0.05] text-[#ff7b72]",
  info: "border-[#58d7f7]/30 bg-[#58d7f7]/[0.05] text-[#58d7f7]",
  critical: "border-[#ff7b72]/30 bg-[#ff7b72]/[0.05] text-[#ff7b72]",
  high: "border-[#ffca8a]/30 bg-[#ffca8a]/[0.05] text-[#ffca8a]",
  medium: "border-[#ffb86b]/30 bg-[#ffb86b]/[0.05] text-[#ffb86b]",
  low: "border-[#58d7f7]/30 bg-[#58d7f7]/[0.05] text-[#58d7f7]",
};

const sizeStyles: Record<string, string> = {
  sm: "px-2 py-0.5 text-[8px]",
  md: "px-2.5 py-1 text-[9px]",
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-mono font-semibold uppercase tracking-tighter",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
