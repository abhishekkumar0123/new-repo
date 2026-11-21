"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  hover?: boolean;
}

export function Card({
  className,
  padded = true,
  hover = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/[0.06] bg-[#090c0f]/80 transition-all",
        hover
          ? "hover:border-[#58d7f7]/30 hover:bg-[#0d1218]/90"
          : "",
        padded ? "p-6 sm:p-7" : "p-4 sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export function CardHeader({
  className,
  title,
  subtitle,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div className={cn("mb-5 flex flex-col gap-1.5", className)} {...props}>
      {title && (
        <h3 className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e]">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="font-mono text-sm leading-6 text-[#bdc8c2]">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({
  className,
  children,
  ...props
}: CardContentProps) {
  return <div className={cn("mt-4", className)} {...props}>{children}</div>;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({
  className,
  children,
  ...props
}: CardFooterProps) {
  return (
    <div
      className={cn("mt-6 border-t border-white/[0.05] pt-5 flex flex-wrap items-center justify-between gap-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}
