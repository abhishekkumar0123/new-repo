import {
  UrlStructure,
  UrlHeuristicIndicator,
  UrlThreatCategory,
} from "../types/url-analyzer";

const SUSPICIOUS_TLDS = new Set([
  "xyz", "top", "loan", "work", "party", "click", "link", "online", "site",
  "club", "website", "space", "stream", "download", "racing", "win", "bid",
  "account", "men", "date", "faith", "review", "trade", "science", "cricket",
  "kim", "wang", "gdn", "men", "mom", "buzz", "surf", "cam", "cfd", "monster",
  "quest", "cyou", "hair", "skin", "autos", "yachts", "homes", "boats", "motorcycles",
]);

const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "adf.ly", "bc.vc", "shorte.st", "cutt.ly", "rebrand.ly", "short.io",
  "t2m.io", "tiny.cc", "v.gd", "x.co", "yourls.org", "po.st", "lnkd.in",
  "fb.me", "goo.gl", "qr.ae", "bit.do", "cli.gs", "tr.im", "u.nu", "urlz.fr",
]);

const BRAND_KEYWORDS = [
  "paypal", "apple", "microsoft", "google", "amazon", "facebook", "instagram",
  "whatsapp", "netflix", "bank", "chase", "wellsfargo", "bankofamerica",
  "citibank", "hsbc", "barclays", "santander", "amex", "americanexpress",
  "coinbase", "binance", "kraken", "crypto", "wallet", "blockchain",
  "github", "gitlab", "bitbucket", "atlassian", "jira", "confluence",
  "slack", "teams", "zoom", "webex", "skype", "discord", "telegram",
  "signal", "protonmail", "outlook", "office365", "onedrive", "sharepoint",
  "dropbox", "box", "drive", "icloud", "icloud.com", "me.com",
];

const SUSPICIOUS_PATH_PATTERNS = [
  /\/wp-admin/,
  /\/wp-login/,
  /\/administrator/,
  /\/phpmyadmin/,
  /\/cpanel/,
  /\/webmail/,
  /\/login/,
  /\/signin/,
  /\/verify/,
  /\/confirm/,
  /\/update/,
  /\/security/,
  /\/account/,
  /\/password/,
  /\/credential/,
  /\/auth/,
  /\/session/,
  /\/token/,
  /\/api\/v\d+\/auth/,
  /\.php$/,
  /\.asp$/,
  /\.aspx$/,
  /\.jsp$/,
  /\.exe$/,
  /\.apk$/,
  /\.zip$/,
  /\.rar$/,
  /\.scr$/,
  /\.bat$/,
  /\.cmd$/,
  /\.ps1$/,
  /\.sh$/,
];

const SUSPICIOUS_QUERY_PARAMS = [
  "redirect", "url", "next", "return", "goto", "target", "dest", "destination",
  "continue", "returnto", "redirectto", "callback", "oauth_callback",
  "state", "code", "token", "access_token", "refresh_token", "id_token",
  "session", "sid", "ssid", "phpsessid", "jsessionid", "aspsessionid",
  "csrf", "xsrf", "nonce", "auth", "password", "passwd", "pwd",
  "username", "user", "login", "email", "mail", "credential",
];

function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isPunycode(hostname: string): boolean {
  return hostname.startsWith("xn--") || hostname.includes(".xn--");
}

function hasHomographIndicators(hostname: string): boolean {
  const suspiciousChars = /[\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F\u1D00-\u1D7F\u1D7F-\u1DBF]/;
  return suspiciousChars.test(hostname);
}

function hasMisleadingSubdomain(hostname: string, rootDomain: string | null): boolean {
  if (!rootDomain) return false;
  const subdomain = hostname.replace(`.${rootDomain}`, "");
  if (!subdomain) return false;
  
  const brandLower = BRAND_KEYWORDS.map(b => b.toLowerCase());
  for (const brand of brandLower) {
    if (subdomain.includes(brand) && !rootDomain.includes(brand)) {
      return true;
    }
  }
  
  if (subdomain.match(/^(www|mail|ftp|admin|api|dev|test|staging|prod|app|secure|security|login|account|support|help|blog|shop|store|pay|payment|billing|invoice|verify|confirm|update|reset|recovery|unlock|verify|authenticate|validation|verification)\d*$/)) {
    return false;
  }
  
  if (subdomain.length > 50 || subdomain.split(".").length > 5) {
    return true;
  }
  
  return false;
}

function hasSuspiciousEncoding(url: string): { detected: boolean; details: string[] } {
  const details: string[] = [];
  let detected = false;
  
  const doubleEncoded = /%25[0-9A-Fa-f]{2}/.test(url);
  if (doubleEncoded) {
    detected = true;
    details.push("Double URL encoding detected (%25XX)");
  }
  
  const nullBytes = /%00/.test(url);
  if (nullBytes) {
    detected = true;
    details.push("Null byte encoding (%00)");
  }
  
  const controlChars = /%0[0-8AB]/.test(url);
  if (controlChars) {
    detected = true;
    details.push("Control character encoding");
  }
  
  const overEncoded = (url.match(/%[0-9A-Fa-f]{2}/g) || []).length > 20;
  if (overEncoded) {
    detected = true;
    details.push("Excessive URL encoding (>20 encoded chars)");
  }
  
  return { detected, details };
}

function hasSuspiciousQueryParams(query: string | null): { detected: boolean; params: string[] } {
  if (!query) return { detected: false, params: [] };
  
  const found: string[] = [];
  for (const param of SUSPICIOUS_QUERY_PARAMS) {
    const regex = new RegExp(`[?&]${param}=`, "i");
    if (regex.test(query)) {
      found.push(param);
    }
  }
  
  return { detected: found.length > 0, params: found };
}

export function analyzeUrlHeuristics(structure: UrlStructure): {
  indicators: UrlHeuristicIndicator[];
  riskScore: number;
  verdict: "clean" | "suspicious" | "high-risk";
} {
  const indicators: UrlHeuristicIndicator[] = [];
  let riskScore = 0;
  
  const { hostname, path, query, fragment, rootDomain, subdomain, tld, isIpAddress, encodedComponents, scheme, port, username, password } = structure;
  
  if (!hostname) {
    return { indicators, riskScore: 100, verdict: "high-risk" };
  }
  
  // URL Length
  const urlLength = structure.normalized.length;
  if (urlLength > 200) {
    indicators.push({
      id: "url-length",
      name: "Excessive URL Length",
      description: `URL is ${urlLength} characters long (>200)`,
      severity: urlLength > 500 ? "high" : "medium",
      category: "structure",
      detected: true,
      value: urlLength,
    });
    riskScore += urlLength > 500 ? 15 : 10;
  }
  
  // IP Address instead of Domain
  if (isIpAddress) {
    indicators.push({
      id: "ip-hostname",
      name: "IP Address as Hostname",
      description: "URL uses an IP address instead of a domain name",
      severity: "high",
      category: "structure",
      detected: true,
      value: hostname,
    });
    riskScore += 25;
  }
  
  // Unusual Subdomain Depth
  const subdomainDepth = subdomain ? subdomain.split(".").length : 0;
  if (subdomainDepth > 3) {
    indicators.push({
      id: "subdomain-depth",
      name: "Deep Subdomain Nesting",
      description: `${subdomainDepth} subdomain level${subdomainDepth !== 1 ? "s" : ""} detected`,
      severity: subdomainDepth > 5 ? "high" : "medium",
      category: "structure",
      detected: true,
      value: subdomainDepth,
    });
    riskScore += subdomainDepth > 5 ? 15 : 10;
  }
  
  // Suspicious TLD
  if (tld && SUSPICIOUS_TLDS.has(tld.toLowerCase())) {
    indicators.push({
      id: "suspicious-tld",
      name: "Suspicious TLD",
      description: `TLD ".${tld}" is commonly associated with abuse`,
      severity: "medium",
      category: "structure",
      detected: true,
      value: tld,
    });
    riskScore += 10;
  }
  
  // Punycode/Homograph
  if (isPunycode(hostname)) {
    indicators.push({
      id: "punycode",
      name: "Punycode Domain (IDN)",
      description: "Domain uses internationalized domain name encoding",
      severity: "medium",
      category: "encoding",
      detected: true,
      value: hostname,
    });
    riskScore += 15;
  }
  
  if (hasHomographIndicators(hostname)) {
    indicators.push({
      id: "homograph",
      name: "Possible Homograph Attack",
      description: "Domain contains non-Latin characters that may mimic legitimate brands",
      severity: "high",
      category: "encoding",
      detected: true,
      value: hostname,
    });
    riskScore += 25;
  }
  
  // Misleading Subdomain (Brand Impersonation)
  if (hasMisleadingSubdomain(hostname, rootDomain)) {
    indicators.push({
      id: "misleading-subdomain",
      name: "Potential Brand Impersonation",
      description: "Subdomain contains brand keywords not present in root domain",
      severity: "high",
      category: "brand",
      detected: true,
      value: subdomain,
    });
    riskScore += 20;
  }
  
  // URL Shortener
  if (rootDomain && URL_SHORTENERS.has(rootDomain.toLowerCase())) {
    indicators.push({
      id: "url-shortener",
      name: "URL Shortener Detected",
      description: `URL uses known shortening service: ${rootDomain}`,
      severity: "medium",
      category: "suspicious-pattern",
      detected: true,
      value: rootDomain,
    });
    riskScore += 15;
  }
  
  // HTTPS vs HTTP
  if (scheme === "http") {
    indicators.push({
      id: "http-scheme",
      name: "Insecure HTTP Protocol",
      description: "URL uses unencrypted HTTP instead of HTTPS",
      severity: "medium",
      category: "structure",
      detected: true,
      value: "http",
    });
    riskScore += 10;
  }
  
  // Embedded Credentials
  if (username || password) {
    indicators.push({
      id: "embedded-credentials",
      name: "Embedded Credentials in URL",
      description: "URL contains username/password in the authority section",
      severity: "high",
      category: "suspicious-pattern",
      detected: true,
      value: username ? `user:${username}` : "password present",
    });
    riskScore += 25;
  }
  
  // Unusual Port
  if (port && !["80", "443", "8080", "8443"].includes(port)) {
    indicators.push({
      id: "unusual-port",
      name: "Non-Standard Port",
      description: `URL uses non-standard port: ${port}`,
      severity: "low",
      category: "structure",
      detected: true,
      value: port,
    });
    riskScore += 5;
  }
  
  // Suspicious Encoding
  const encodingResult = hasSuspiciousEncoding(structure.normalized);
  if (encodingResult.detected) {
    indicators.push({
      id: "suspicious-encoding",
      name: "Suspicious URL Encoding",
      description: encodingResult.details.join("; "),
      severity: "medium",
      category: "encoding",
      detected: true,
      details: encodingResult.details.join("; "),
    });
    riskScore += 15;
  }
  
  // Excessive Encoded Components
  if (encodedComponents.length > 10) {
    indicators.push({
      id: "excessive-encoding",
      name: "Excessive URL Encoding",
      description: `${encodedComponents.length} encoded components found`,
      severity: "medium",
      category: "encoding",
      detected: true,
      value: encodedComponents.length,
    });
    riskScore += 10;
  }
  
  // Suspicious Path Patterns
  if (path) {
    for (const pattern of SUSPICIOUS_PATH_PATTERNS) {
      if (pattern.test(path)) {
        indicators.push({
          id: `suspicious-path-${pattern.source}`,
          name: "Suspicious Path Pattern",
          description: `Path matches pattern commonly used in phishing: ${pattern.source}`,
          severity: "medium",
          category: "suspicious-pattern",
          detected: true,
          value: path,
        });
        riskScore += 10;
        break;
      }
    }
    
    // Random-looking path segments
    const pathSegments = path.split("/").filter(Boolean);
    let randomSegments = 0;
    for (const segment of pathSegments) {
      if (segment.length > 8 && calculateEntropy(segment) > 3.5 && /^[a-zA-Z0-9]+$/.test(segment)) {
        randomSegments++;
      }
    }
    if (randomSegments > 2) {
      indicators.push({
        id: "random-path",
        name: "Random-Looking Path Segments",
        description: `${randomSegments} path segments appear randomly generated`,
        severity: "medium",
        category: "suspicious-pattern",
        detected: true,
        value: randomSegments,
      });
      riskScore += 10;
    }
  }
  
  // Suspicious Query Parameters
  const queryResult = hasSuspiciousQueryParams(query);
  if (queryResult.detected) {
    indicators.push({
      id: "suspicious-query",
      name: "Suspicious Query Parameters",
      description: `Parameters often used in redirects/phishing: ${queryResult.params.join(", ")}`,
      severity: "medium",
      category: "suspicious-pattern",
      detected: true,
      details: queryResult.params.join(", "),
    });
    riskScore += queryResult.params.length * 5;
  }
  
  // Fragment with suspicious content
  if (fragment && fragment.length > 50) {
    indicators.push({
      id: "long-fragment",
      name: "Long URL Fragment",
      description: `Fragment is ${fragment.length} characters (may contain encoded payload)`,
      severity: "low",
      category: "suspicious-pattern",
      detected: true,
      value: fragment.length,
    });
    riskScore += 5;
  }
  
  // High entropy hostname (DGA-like)
  if (hostname && !isIpAddress) {
    const hostnameEntropy = calculateEntropy(hostname.replace(/\./g, ""));
    if (hostnameEntropy > 3.8 && hostname.length > 15) {
      indicators.push({
        id: "high-entropy-hostname",
        name: "High Entropy Hostname",
        description: `Hostname entropy (${hostnameEntropy.toFixed(2)}) suggests algorithmically generated domain`,
        severity: "medium",
        category: "suspicious-pattern",
        detected: true,
        value: hostnameEntropy.toFixed(2),
      });
      riskScore += 15;
    }
  }
  
  // Determine verdict
  let verdict: "clean" | "suspicious" | "high-risk" = "clean";
  if (riskScore >= 50) verdict = "high-risk";
  else if (riskScore >= 20) verdict = "suspicious";
  
  return { indicators, riskScore, verdict };
}