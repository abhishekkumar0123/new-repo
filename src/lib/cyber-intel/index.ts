export * from "./types";
export * from "./types/ioc";
export * from "./types/ip-reputation";

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
  fetchUrlhausRecent,
  fetchThreatFoxRecent,
  searchThreatFoxIOC,
  fetchAllThreatIntel,
  checkThreatIntelStatus,
  normalizeIOCs,
  filterIOCs,
  sortIOCs,
  paginateIOCs,
  buildIOCListResult,
  getIOCTypeLabel,
  getIOCTypeColor,
  buildThreatActivity,
  getProxyUrl,
  clearUrlhausCache,
  clearThreatFoxCache,
} from "./api/threat-intel";

export {
  fetchIPReputation,
  checkIPReputationSourceStatus,
  clearIPReputationCache,
  getCachedIPReputation,
  addToHistory,
  getHistory,
  clearHistory,
  exportInvestigation,
  validateIP,
  getRiskColor,
  getRiskLabel,
  getClassificationColor,
  getClassificationLabel,
  getSourceLabel,
} from "./api/ip-reputation";

export {
  type IPReputationResult,
  type IPReputationSourceStatus,
  type IPReputationStatus,
  type IPLookupParams,
  type IPLookupHistoryEntry,
} from "./types/ip-reputation";

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
