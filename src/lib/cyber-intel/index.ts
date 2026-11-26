export * from "./types";
export * from "./types/zero-day";
export * from "./types/ip-reputation";
export * from "./types/domain-intelligence";
export * from "./types/url-analyzer";

export {
  type IOCType,
  type HashType,
  type HashSource,
  type CertificateSource,
  type HashVerdict,
  type CertificateStatus,
  type IOCInvestigatorStatus,
  type IOCInvestigatorSourceStatus,
  type HashLookupResult,
  type HashLookupParams,
  type HashLookupHistoryEntry,
  type IOCEnrichmentResult,
  type IOCEnrichmentParams,
  type IOCEnrichmentHistoryEntry,
  type CertificateInfo,
  type CertificateInspectorParams,
  type CertificateInspectorHistoryEntry,
  detectHashType,
  detectIOCType,
  normalizeIOC,
  getCertificateStatusColor,
  getCertificateStatusLabel,
  calculateCertificateStatus,
} from "./types/ioc-investigator";

export {
  fetchNvdCveList,
  fetchNvdCveById,
  fetchNvdCvesByIds,
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
  getKevFeedWithStatus,
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
  fetchHashLookup,
  checkHashLookupStatus,
  fetchMalwareBazaarHash,
  fetchVirusTotalHash,
  fetchOTXHash,
  fetchThreatFoxHash,
  fetchURLhausHash,
  clearHashCache,
  getCachedHashLookup,
  addToHashHistory,
  getHashHistory,
  clearHashHistory,
  exportHashInvestigation,
} from "./api/hash-lookup";

export {
  enrichIOC,
  checkIOCEnrichmentStatus,
  clearEnrichmentCache,
  getCachedEnrichment,
  addToEnrichmentHistory,
  getEnrichmentHistory,
  clearEnrichmentHistory,
  exportEnrichmentInvestigation,
} from "./api/ioc-enrichment";

export {
  inspectCertificate,
  checkCertificateInspectorStatus,
  clearCertCache,
  getCachedCertificates,
  addToCertHistory,
  getCertHistory,
  clearCertHistory,
  exportCertInvestigation,
} from "./api/certificate-inspector";

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

export {
  fetchSecurityNews,
  checkNewsSourcesStatus,
  clearNewsCache,
  getNewsProxyUrl,
  getSourceDisplayName,
  extractCveIds,
  stripHtml,
  sanitizeUrl,
  formatRelativeTime,
  formatAbsoluteTime,
} from "./api/security-news";

export {
  fetchZeroDayDataset,
  clearZeroDayCache,
  fetchGithubAdvisories,
  clearGithubAdvisoriesCache,
  fetchExploitDbEntries,
  clearExploitDbCache,
  fetchCisaAdvisories,
  clearCisaAdvisoriesCache,
  classifyAlertText,
  hasExploitationEvidence,
  isZeroDayText,
  getZeroDayProxyUrl,
  isZeroDayProxyConfigured,
  fetchZeroDayProxyResource,
  buildZeroDayRecords,
  buildZeroDayAlerts,
} from "./api/zero-day";

export {
  NEWS_CATEGORIES,
  NEWS_SOURCES,
  getNewsCategory,
  getNewsCategoryLabel,
  getNewsCategoryColor,
  classifyNewsCategory,
  getNewsSource,
  NEWS_CACHE_TTL_MS,
  NEWS_STALE_TTL_MS,
  NEWS_BOOKMARKS_KEY,
  NEWS_READ_KEY,
  NEWS_RECENT_KEY,
  type NewsCategoryId,
  type NewsCategory,
  type NewsSourceId,
  type NewsSource,
  type NewsArticle,
  type NewsFeedStatus,
  type NewsSourceStatus,
  type NewsFeedResult,
  type NewsAggregationResult,
  type NewsQueryOptions,
  type NewsSortOrder,
  type NewsBookmarkEntry,
  type NewsReadState,
} from "./types/security-news";
