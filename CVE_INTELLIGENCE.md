# CVE Intelligence Center — Architecture Documentation

## Overview

The CVE Intelligence Center is a public, client-side vulnerability intelligence feature for the cybersecurity portfolio. It aggregates data from three public, keyless APIs:

1. **NVD** (National Vulnerability Database) — CVE records, CVSS scores, affected products, references
2. **CISA KEV** (Known Exploited Vulnerabilities Catalog) — actively exploited vulnerabilities
3. **FIRST EPSS** — exploitation probability scores and percentiles

## Directory Structure

```
src/lib/cyber-intel/
  types/          — TypeScript data models and constants
  api/            — External API clients (NVD, CISA KEV, FIRST EPSS)
  utils/          — Normalization, filtering, sorting, pagination, caching
src/components/cyber-intel/
  cve-intelligence-entry.tsx — Entry page component
src/app/cyber-intelligence/
  page.tsx        — Route page (static export compatible)
```

## Data Flow

```
Browser → Public API (NVD / CISA KEV / FIRST EPSS)
    ↓
API client (fetch with throttle + error handling)
    ↓
Normalization (raw API → internal CveRecord model)
    ↓
Client-side cache (TTL-based, in-memory)
    ↓
React component (render CVE data)
```

All data fetching happens in the browser. No server-side API routes, no Next.js API endpoints, and no private keys are used.

## Type Definitions (`types/index.ts`)

- **`CveRecord`** — normalized internal model for a single CVE
- **`CveListResult`** — paginated list result with metadata
- **`CveSearchParams`** — query parameters for search/filter
- **`CveIntelligenceStatus`** — per-source availability status
- **`SourceStatus`** — availability, error, rate-limit state per API
- **`CvssMetric`, `CweInfo`, `Reference`, `AffectedProduct`, `KevInfo`, `EpssInfo`** — sub-models

Constants:
- `CVSS_SEVERITY_ORDER`, `CVSS_SEVERITY_LABELS`, `CVSS_SEVERITY_COLORS`
- `DEFAULT_CACHE_TTL_MS` (5 minutes)

## API Clients (`api/`)

### NVD (`api/nvd.ts`)
- Endpoint: `https://services.nvd.nist.gov/rest/json/cves/2.0`
- Keyless, rate-limited (1 request every ~7 seconds to stay within NVD's 1 request per 5-7 second guidance)
- Functions: `fetchNvdCveList`, `fetchNvdCveById`, `checkNvdAvailability`, `checkCveIntelligenceStatus`

### CISA KEV (`api/cisa-kev.ts`)
- Endpoint: `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`
- Keyless, full catalog fetch (~1-2 minutes TTL cache)
- Functions: `getCachedKevFeed`, `enrichCveWithKev`, `checkKevStatusForCve`, `checkCisaKevAvailability`

### FIRST EPSS (`api/epss.ts`)
- Endpoint: `https://api.first.org/data/v1/epss`
- Keyless, per-CVE lookup (~1 second throttle between requests, 1 hour TTL cache)
- Functions: `enrichCveWithEpss`, `checkFirstEpssAvailability`

## Utilities (`utils/`)

### Normalization (`utils/normalize.ts`)
- `normalizeCveRecord` — build a complete CveRecord from partial data
- `mergeCveRecords` — merge base record with enriched overlays
- `highestCvssScore` / `highestCvssSeverity` — pick the top CVSS metric
- `filterCvesByQuery` / `filterCvesBySeverity` / `filterCvesByKev` — filtering
- `sortCves` — sort by date, score, or ID
- `paginateCves` / `buildListResult` — pagination helpers
- `formatDate` / `formatCvssVector` / `formatEpssScore` / `formatEpssPercentile` — display formatting
- `sanitizeHtml` / `escapeHtml` — XSS prevention for external content

### Cache (`utils/cache.ts`)
- `CveMemoryCache` — TTL-based in-memory cache
- `cveCache` — singleton instance
- `cacheKey` — build namespaced cache keys
- `withCache` — wrapper that returns cached data or fetches and stores
- `DEFAULT_CACHE_TTL_MS` — 5 minute default TTL

## GitHub Pages / Static Export Compatibility

- `output: "export"` in `next.config.ts` — no server-side rendering or API routes
- All API calls are made from client-side components (`"use client"`)
- No `NEXT_PUBLIC_` secrets are required for the public APIs used
- Base path `/new-repo` is handled by Next.js automatically
- No Node.js-only dependencies introduced

### CORS Consideration

Some public APIs may not include CORS headers for browser-based fetch requests. If CORS blocks direct browser access in production, the architecture is designed to support a Supabase Edge Function proxy in a future step. The API client functions accept a URL and can be redirected through a proxy without changing the data model.

## Rate Limit Handling

- **NVD**: 1 request per 7 seconds enforced via `throttleNvdRequest`
- **CISA KEV**: Full catalog cached for 1 hour, no per-request throttling needed
- **FIRST EPSS**: 1 request per second enforced via `throttleEpssRequest`, per-CVE cache for 1 hour
- Errors return graceful degraded status rather than crashing

## API Keys

No API keys are required for NVD, CISA KEV, or FIRST EPSS. All are public keyless APIs. No credentials are stored in environment variables, browser code, or Git.

## Static Hosting Limitations

- No server-side IP rate limiting (contact forms and API calls are client-side)
- Browser-based fetch may be blocked by CORS on some APIs
- No scheduled data collection; data is fetched on-demand when pages load
- Cache is in-memory only (cleared on page refresh)

## Future Integration

### Part 2 — CVE Explorer
Use `fetchNvdCveList` with `CveSearchParams`, then `filterCvesByQuery`, `filterCvesBySeverity`, `sortCves`, and `paginateCves` to build the explorer UI.

### Part 3 — CVE Detail Pages
Use `fetchNvdCveById` to load a single CVE, then `enrichCveWithKev` and `enrichCveWithEpss` to add KEV and EPSS data.

### Part 4 — KEV and EPSS Integration
Already partially built in Part 1. The `enrichCveWithKev` and `enrichCveWithEpss` functions are ready for use on detail pages.

### Part 5 — Homepage Latest-CVE Dashboard
Use `fetchNvdCveList` sorted by last modified date to show recent CVEs on the homepage.

### Supabase Edge Function Proxy (future)
If CORS blocks direct browser access, API client functions can be updated to call a Supabase Edge Function instead of the public API directly. The data model and normalization remain unchanged.
