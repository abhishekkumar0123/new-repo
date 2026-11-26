import type { AlertCategory } from "../../types/zero-day";

const ZERO_DAY_PATTERN = /\bzero[- ]?day\b|\b0[- ]?day\b/i;
const EXPLOITATION_PATTERN =
  /active(?:ly)? exploit|known exploit|exploited in the wild|in[- ]the[- ]wild|mass exploit|ransomware campaign/i;
const ADVISORY_PATTERN = /advisory|security update|patch(?:ed)?|bulletin/i;
const RESEARCH_PATTERN = /research(?:er)?|disclos(?:e|ure)|proof[- ]of[- ]concept|\bpoc\b/i;

export function isZeroDayText(text: string | null | undefined): boolean {
  return Boolean(text && ZERO_DAY_PATTERN.test(text));
}

export function hasExploitationEvidence(text: string | null | undefined): boolean {
  return Boolean(text && EXPLOITATION_PATTERN.test(text));
}

export function classifyAlertText(
  title: string,
  excerpt?: string | null,
): AlertCategory {
  const combined = `${title} ${excerpt ?? ""}`;
  if (isZeroDayText(combined)) return "zero-day";
  if (hasExploitationEvidence(combined)) return "active-exploitation";
  if (ADVISORY_PATTERN.test(combined)) return "vendor-advisory";
  if (RESEARCH_PATTERN.test(combined)) return "research-disclosure";
  return "general";
}
