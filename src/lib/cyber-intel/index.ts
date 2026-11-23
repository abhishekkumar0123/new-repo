export * from "./types";
export * from "./types/ioc";
export * from "./types/ip-reputation";
export * from "./types/domain-intelligence";
export * from "./types/url-analyzer";

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
  fetchDomainIntelligence,
  checkDomainIntelStatus,
  clearDomainIntelCache,
  getCachedDomainIntelligence,
  addToDomainHistory,
  getDomainHistory,
  clearDomainHistory,
  exportDomainInvestigation,
  getSourceColor,
} from "./api/domain-intelligence";

export {
  extractDomain,
  getRootDomain,
  getSubdomain,
  getTld,
  formatDomainAge,
} from "./types/domain-intelligence";

export {
  fetchAllUrlReputation,
  checkUrlAnalyzerStatus,
  fetchUrlhausUrl,
  fetchVirusTotalUrl,
  fetchPhishTankUrl,
  fetchOpenPhishUrl,
  fetchOtxUrl,
  checkUrlhausAvailability,
  checkVirusTotalAvailability,
  checkPhishTankAvailability,
  checkOpenPhishAvailability,
  checkOtxAvailability,
} from "./api/url-reputation";

export {
  analyzeUrlHeuristics,
} from "./utils/url-heuristics";

export {
  parseUrlStructure,
  normalizeUrl,
  getVerdictColor,
  getVerdictLabel,
  getCategoryColor,
  getCategoryLabel,
  type UrlAnalysisResult,
  type UrlStructure,
  type UrlHeuristicIndicator,
  type UrlThreatResult,
  type UrlRedirectChain,
  type UrlRedirectHop,
  type UrlVerdict,
  type UrlThreatCategory,
  type UrlSource,
  type UrlSearchParams,
  type UrlLookupHistoryEntry,
} from "./types/url-analyzer";

export {
  investigateRedirectChain,
  quickHeadCheck,
} from "./utils/url-redirect";

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
