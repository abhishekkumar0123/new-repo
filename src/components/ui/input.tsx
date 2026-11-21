"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  className,
  label,
  error,
  id,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]"
          htmlFor={id}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "h-11 w-full rounded-md border border-white/[0.08] bg-[#070b10]/80 px-4 font-mono text-sm text-[#dfe7e3] outline-none transition-all placeholder:text-[#77847e] focus:border-[#58d7f7]/40 focus:ring-0",
          error ? "border-[#ff7b72]/40" : "",
          className,
        )}
        {...props}
      />
      {error && (
        <p className="font-mono text-[8px] text-[#ff7b72]">{error}</p>
      )}
    </div>
  );
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  className,
  label,
  error,
  id,
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]"
          htmlFor={id}
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "min-h-[120px] rounded-md border border-white/[0.08] bg-[#070b10]/80 px-4 py-3 font-mono text-sm text-[#dfe7e3] outline-none transition-all placeholder:text-[#77847e] focus:border-[#58d7f7]/40 focus:ring-0 resize-none",
          error ? "border-[#ff7b72]/40" : "",
          className,
        )}
        {...props}
      />
      {error && (
        <p className="font-mono text-[8px] text-[#ff7b72]">{error}</p>
      )}
    </div>
  );
}
