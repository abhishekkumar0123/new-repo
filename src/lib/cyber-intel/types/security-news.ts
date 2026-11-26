export type NewsCategoryId =
  | "latest"
  | "vulnerabilities"
  | "zero-day"
  | "ransomware"
  | "malware"
  | "threat-intel"
  | "data-breach"
  | "phishing"
  | "cloud"
  | "network"
  | "appsec"
  | "ai-security"
  | "research"
  | "vendor-advisory"
  | "privacy";

export interface NewsCategory {
  id: NewsCategoryId;
  label: string;
  shortLabel: string;
  color: string;
  keywords: string[];
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  {
    id: "latest",
    label: "Latest Cybersecurity News",
    shortLabel: "Latest",
    color: "#58d7f7",
    keywords: [],
  },
  {
    id: "vulnerabilities",
    label: "Vulnerabilities & CVEs",
    shortLabel: "Vulnerabilities",
    color: "#f97316",
    keywords: ["cve-", "vulnerability", "vulnerabilities", "flaw", "patch", "patched", "bug", "exploit"],
  },
  {
    id: "zero-day",
    label: "Zero-Day Exploits",
    shortLabel: "Zero-Day",
    color: "#ef4444",
    keywords: ["zero-day", "zero day", "0-day", "0day", "n-day", "actively exploited", "in the wild"],
  },
  {
    id: "ransomware",
    label: "Ransomware",
    shortLabel: "Ransomware",
    color: "#dc2626",
    keywords: ["ransomware", "ransom", "extortion", "double extortion", "lockbit", "blackcat", "alphv", "hive", "conti", "ransom hub", "play ransomware", "8base"],
  },
  {
    id: "malware",
    label: "Malware & Botnets",
    shortLabel: "Malware",
    color: "#a855f7",
    keywords: ["malware", "botnet", "trojan", "backdoor", "rootkit", "worm", "keylogger", "spyware", "loader", "dropper", "miner", "cryptominer"],
  },
  {
    id: "threat-intel",
    label: "Threat Intelligence",
    shortLabel: "Threat Intel",
    color: "#eab308",
    keywords: ["threat intelligence", "threat actor", "apt", "apt29", "apt28", "nation-state", "campaign", "attribution", "ttp", "mitre att&ck", "indicator", "ioc", "c2", "command-and-control"],
  },
  {
    id: "data-breach",
    label: "Data Breaches",
    shortLabel: "Data Breach",
    color: "#f43f5e",
    keywords: ["data breach", "breach", "leaked", "leak", "exposed", "database exposed", "stolen data", "records exposed", "compromised"],
  },
  {
    id: "phishing",
    label: "Phishing & Social Engineering",
    shortLabel: "Phishing",
    color: "#fb923c",
    keywords: ["phishing", "spear-phishing", "spear phishing", "social engineering", "scam", "fraud", "spoofing", "vishing", "smishing", "bec", "business email compromise"],
  },
  {
    id: "cloud",
    label: "Cloud Security",
    shortLabel: "Cloud",
    color: "#38bdf8",
    keywords: ["cloud security", "aws", "azure", "gcp", "google cloud", "kubernetes", "container", "s3 bucket", "cloudflare", "serverless", "iam"],
  },
  {
    id: "network",
    label: "Network Security",
    shortLabel: "Network",
    color: "#22d3ee",
    keywords: ["network security", "firewall", "router", "vpn", "tcp/ip", "dns", "ddos", "man-in-the-middle", "mitm", "packet", "wireless", "wi-fi", "wifi"],
  },
  {
    id: "appsec",
    label: "Application Security",
    shortLabel: "AppSec",
    color: "#4ade80",
    keywords: ["application security", "code execution", "rce", "sql injection", "sqli", "xss", "cross-site", "ssrf", "deserialization", "injection", "api security", "web app", "owasp"],
  },
  {
    id: "ai-security",
    label: "AI & Cybersecurity",
    shortLabel: "AI Security",
    color: "#c084fc",
    keywords: ["artificial intelligence", "ai ", " ai", "machine learning", "deepfake", "large language model", "llm", "prompt injection", "generative ai", "chatgpt", "neural"],
  },
  {
    id: "research",
    label: "Security Research",
    shortLabel: "Research",
    color: "#2dd4bf",
    keywords: ["research", "analysis", "dissect", "reverse engineering", "proof-of-concept", "poc", "paper", "study", "investigation", "researchers"],
  },
  {
    id: "vendor-advisory",
    label: "Vendor Security Advisories",
    shortLabel: "Advisory",
    color: "#94a3b8",
    keywords: ["advisory", "security advisory", "bulletin", "security update", "patch tuesday", "release", "vendor"],
  },
  {
    id: "privacy",
    label: "Privacy & Data Protection",
    shortLabel: "Privacy",
    color: "#f472b6",
    keywords: ["privacy", "gdpr", "ccpa", "data protection", "surveillance", "encryption", "backdoor law", "facial recognition", "tracking"],
  },
];

const CATEGORY_MAP = new Map<NewsCategoryId, NewsCategory>(
  NEWS_CATEGORIES.map((c) => [c.id, c]),
);

export function getNewsCategory(id: NewsCategoryId): NewsCategory {
  return CATEGORY_MAP.get(id) ?? NEWS_CATEGORIES[0];
}

export function getNewsCategoryLabel(id: NewsCategoryId): string {
  return getNewsCategory(id).label;
}

export function getNewsCategoryColor(id: NewsCategoryId): string {
  return getNewsCategory(id).color;
}

/**
 * Transparent, rule-based classification. Scores each category by keyword
 * hits in the title (weighted higher) and excerpt, then returns the best
 * match. Falls back to "latest" when nothing matches. No AI/ML involved.
 */
export function classifyNewsCategory(title: string, excerpt: string): NewsCategoryId {
  const titleLower = title.toLowerCase();
  const excerptLower = excerpt.toLowerCase();

  let best: NewsCategoryId = "latest";
  let bestScore = 0;

  for (const category of NEWS_CATEGORIES) {
    if (category.id === "latest" || category.keywords.length === 0) continue;
    let score = 0;
    for (const keyword of category.keywords) {
      const kw = keyword.toLowerCase();
      if (titleLower.includes(kw)) score += 3;
      else if (excerptLower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = category.id;
    }
  }

  return best;
}

export type NewsSourceId =
  | "thehackernews"
  | "bleepingcomputer"
  | "securityweek"
  | "darkreading"
  | "krebs"
  | "sans-isc"
  | "the-record"
  | "malwarebytes"
  | "google-security"
  | "microsoft-security"
  | "cisco-talos"
  | "unit42"
  | "crowdstrike"
  | "trendmicro"
  | "rapid7"
  | "tenable";

export interface NewsSource {
  id: NewsSourceId;
  name: string;
  url: string;
  homepage: string;
  group: "news" | "research" | "advisory";
}

export const NEWS_SOURCES: NewsSource[] = [
  { id: "thehackernews", name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", homepage: "https://thehackernews.com", group: "news" },
  { id: "bleepingcomputer", name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", homepage: "https://www.bleepingcomputer.com", group: "news" },
  { id: "securityweek", name: "SecurityWeek", url: "https://www.securityweek.com/feed/", homepage: "https://www.securityweek.com", group: "news" },
  { id: "darkreading", name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", homepage: "https://www.darkreading.com", group: "news" },
  { id: "krebs", name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", homepage: "https://krebsonsecurity.com", group: "news" },
  { id: "sans-isc", name: "SANS Internet Storm Center", url: "https://isc.sans.edu/rssfeed_full.xml", homepage: "https://isc.sans.edu", group: "news" },
  { id: "the-record", name: "The Record", url: "https://therecord.media/feed", homepage: "https://therecord.media", group: "news" },
  { id: "malwarebytes", name: "Malwarebytes Labs", url: "https://www.malwarebytes.com/blog/feed/index.xml", homepage: "https://www.malwarebytes.com/blog", group: "news" },
  { id: "google-security", name: "Google Security Blog", url: "https://security.googleblog.com/feeds/posts/default", homepage: "https://security.googleblog.com", group: "research" },
  { id: "microsoft-security", name: "Microsoft Security Blog", url: "https://www.microsoft.com/en-us/security/blog/feed/", homepage: "https://www.microsoft.com/en-us/security/blog", group: "research" },
  { id: "cisco-talos", name: "Cisco Talos Intelligence", url: "https://blog.talosintelligence.com/rss/", homepage: "https://blog.talosintelligence.com", group: "research" },
  { id: "unit42", name: "Unit 42 (Palo Alto Networks)", url: "https://unit42.paloaltonetworks.com/feed/", homepage: "https://unit42.paloaltonetworks.com", group: "research" },
  { id: "crowdstrike", name: "CrowdStrike Blog", url: "https://www.crowdstrike.com/blog/feed/", homepage: "https://www.crowdstrike.com/blog", group: "research" },
  { id: "trendmicro", name: "Trend Micro Research", url: "https://blog.trendmicro.com/feed/", homepage: "https://blog.trendmicro.com", group: "research" },
  { id: "rapid7", name: "Rapid7 Blog", url: "https://blog.rapid7.com/rss/", homepage: "https://blog.rapid7.com", group: "research" },
  { id: "tenable", name: "Tenable Blog", url: "https://www.tenable.com/blog/feed", homepage: "https://www.tenable.com/blog", group: "advisory" },
];

const SOURCE_MAP = new Map<NewsSourceId, NewsSource>(
  NEWS_SOURCES.map((s) => [s.id, s]),
);

export function getNewsSource(id: NewsSourceId): NewsSource | undefined {
  return SOURCE_MAP.get(id);
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  sourceId: NewsSourceId;
  sourceName: string;
  sourceHomepage: string;
  url: string;
  publishedAt: string | null;
  author: string | null;
  category: NewsCategoryId;
  tags: string[];
  imageUrl: string | null;
  cveIds: string[];
  fetchedAt: string;
}

export type NewsFeedStatus = "live" | "cached" | "stale" | "unavailable";

export interface NewsSourceStatus {
  sourceId: NewsSourceId;
  name: string;
  group: NewsSource["group"];
  status: NewsFeedStatus;
  available: boolean;
  articleCount: number;
  latestArticleAt: string | null;
  lastSuccessfulUpdate: string | null;
  error: string | null;
}

export interface NewsFeedResult {
  sourceId: NewsSourceId;
  available: boolean;
  articles: NewsArticle[];
  error: string | null;
  fetchedAt: string;
}

export interface NewsAggregationResult {
  articles: NewsArticle[];
  sources: NewsSourceStatus[];
  fetchedAt: string;
  totalArticles: number;
  availableSources: number;
  totalSources: number;
}

export interface NewsQueryOptions {
  sources?: NewsSourceId[];
  forceRefresh?: boolean;
  limitPerSource?: number;
}

export type NewsSortOrder = "newest" | "oldest" | "source";

export interface NewsBookmarkEntry {
  articleId: string;
  title: string;
  url: string;
  sourceName: string;
  savedAt: string;
}

export interface NewsReadState {
  [articleId: string]: string;
}

export const NEWS_CACHE_TTL_MS = 30 * 60 * 1000;
export const NEWS_STALE_TTL_MS = 2 * 60 * 60 * 1000;
export const NEWS_BOOKMARKS_KEY = "security-news-bookmarks";
export const NEWS_READ_KEY = "security-news-read";
export const NEWS_RECENT_KEY = "security-news-recent";