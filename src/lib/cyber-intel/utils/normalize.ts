import {
  CveRecord,
  CveListResult,
  CveSearchParams,
  CvssSeverity,
} from "../types";

export function normalizeCveRecord(raw: Partial<CveRecord>): CveRecord {
  return {
    id: raw.id ?? "",
    cveId: raw.cveId ?? "",
    description: raw.description ?? null,
    publishedDate: raw.publishedDate ?? null,
    lastModifiedDate: raw.lastModifiedDate ?? null,
    cvss: raw.cvss ?? [],
    cwe: raw.cwe ?? [],
    affectedProducts: raw.affectedProducts ?? [],
    references: raw.references ?? [],
    kev: raw.kev ?? {
      inKev: false,
      dateAdded: null,
      dueDate: null,
      ransomwareCampaign: null,
      source: null,
    },
    epss: raw.epss ?? {
      score: null,
      percentile: null,
      date: null,
    },
    source: raw.source ?? {
      source: "combined",
      fetchedAt: null,
      rawUrl: null,
    },
  };
}

export function mergeCveRecords(
  base: CveRecord,
  overlay: Partial<CveRecord>,
): CveRecord {
  return {
    ...base,
    ...overlay,
    cvss: overlay.cvss ?? base.cvss,
    cwe: overlay.cwe ?? base.cwe,
    affectedProducts: overlay.affectedProducts ?? base.affectedProducts,
    references: overlay.references ?? base.references,
    kev: overlay.kev ?? base.kev,
    epss: overlay.epss ?? base.epss,
    source: overlay.source ?? base.source,
  };
}

export function highestCvssScore(cve: CveRecord): number | null {
  if (cve.cvss.length === 0) return null;
  return Math.max(...cve.cvss.map((m) => m.baseScore ?? 0));
}

export function highestCvssSeverity(cve: CveRecord): CvssSeverity | null {
  if (cve.cvss.length === 0) return null;

  const ordered = [...cve.cvss].sort(
    (a, b) => (b.baseScore ?? 0) - (a.baseScore ?? 0),
  );
  return ordered[0].baseSeverity ?? null;
}

export function filterCvesByQuery(
  cves: CveRecord[],
  query: string,
): CveRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return cves;

  return cves.filter((cve) => {
    const haystack = [
      cve.cveId,
      cve.description,
      cve.cwe.map((c) => c.id).join(" "),
      cve.affectedProducts
        .map((p) => [p.vendor, p.product].join(" "))
        .join(" "),
      cve.references.map((r) => r.url).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function filterCvesBySeverity(
  cves: CveRecord[],
  severity: CvssSeverity | "All",
): CveRecord[] {
  if (severity === "All") return cves;
  return cves.filter((cve) => {
    const sev = highestCvssSeverity(cve);
    return sev === severity;
  });
}

export function filterCvesByKev(
  cves: CveRecord[],
  inKev: boolean | "All",
): CveRecord[] {
  if (inKev === "All") return cves;
  return cves.filter((cve) => cve.kev.inKev === inKev);
}

export function sortCves(
  cves: CveRecord[],
  sortBy: "date" | "score" | "id",
  sortOrder: "asc" | "desc",
): CveRecord[] {
  return [...cves].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "date") {
      const aDate = a.lastModifiedDate ? new Date(a.lastModifiedDate).getTime() : 0;
      const bDate = b.lastModifiedDate ? new Date(b.lastModifiedDate).getTime() : 0;
      comparison = aDate - bDate;
    } else if (sortBy === "score") {
      const aScore = highestCvssScore(a) ?? 0;
      const bScore = highestCvssScore(b) ?? 0;
      comparison = aScore - bScore;
    } else {
      comparison = a.cveId.localeCompare(b.cveId);
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });
}

export function paginateCves<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; totalPages: number; totalItems: number; currentPage: number } {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    totalPages,
    totalItems,
    currentPage: safePage,
  };
}

export function buildListResult(
  cves: CveRecord[],
  params: CveSearchParams,
  totalResults: number,
): CveListResult {
  const resultsPerPage = params.resultsPerPage ?? 20;
  const startIndex = params.startIndex ?? 0;
  const paginated = cves.slice(startIndex, startIndex + resultsPerPage);

  return {
    cves: paginated,
    totalResults,
    resultsPerPage,
    startIndex,
    hasMore: startIndex + paginated.length < totalResults,
  };
}

export function formatCvssVector(vector: string | null): string {
  if (!vector) return "N/A";
  return vector;
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
}

export function formatEpssScore(score: number | null): string {
  if (score === null) return "N/A";
  return (score * 100).toFixed(2) + "%";
}

export function formatEpssPercentile(percentile: number | null): string {
  if (percentile === null) return "N/A";
  return percentile.toFixed(1) + "%";
}

export function sanitizeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
