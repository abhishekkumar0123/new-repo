export * from "./types";

export {
  fetchNvdCveList,
  fetchNvdCveById,
  checkNvdAvailability,
  checkCveIntelligenceStatus,
  type CveSearchParams,
} from "./api";

export {
  enrichCveWithKev,
  checkKevStatusForCve,
  checkCisaKevAvailability,
  clearKevCache,
  getCachedKevFeed,
} from "./api/cisa-kev";

export {
  enrichCveWithEpss,
  checkFirstEpssAvailability,
  clearEpssCache,
  fetchEpssBatch,
} from "./api/epss";

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
} from "./utils/normalize";

export {
  cveCache,
  cacheKey,
  withCache,
  DEFAULT_CACHE_TTL_MS,
} from "./utils/cache";

export {
  parseCvssVector,
  formatCvssMetricLabel,
  type CvssVectorComponents,
} from "./utils/cvss-vector";
