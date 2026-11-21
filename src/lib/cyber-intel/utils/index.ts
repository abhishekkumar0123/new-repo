export {
  normalizeCveRecord,
  mergeCveRecords,
  highestCvssScore,
  highestCvssSeverity,
  filterCvesByQuery,
  filterCvesBySeverity,
  filterCvesByKev,
  sortCves,
  paginateCves,
  buildListResult,
  formatCvssVector,
  formatDate,
  formatEpssScore,
  formatEpssPercentile,
  sanitizeHtml,
  escapeHtml,
} from "./normalize";

export {
  cveCache,
  cacheKey,
  withCache,
  DEFAULT_CACHE_TTL_MS,
} from "./cache";
