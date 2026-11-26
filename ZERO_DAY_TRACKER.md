# Zero-Day & Exploit Tracker

Route: `/zero-day-tracker`

The tracker is a browser-side, static-export-compatible intelligence workspace. It correlates public, keyless sources and shows exactly which source supplied each field. It does **not** retrieve, store, publish, or execute exploit code.

## Integrated sources

| Source | Access | Data used | Status when unavailable |
| --- | --- | --- | --- |
| CISA Known Exploited Vulnerabilities (KEV) | Proxy preferred; direct browser fallback | Confirmed exploitation, date added, due date, ransomware flag, vendor/product, CWE | `unavailable` / cached catalog notice |
| NVD 2.0 | Direct, keyless, CORS-enabled | CVSS, CWE, affected versions, references | `unavailable` or `no-data` |
| FIRST EPSS | Direct, keyless, CORS-enabled | EPSS probability, percentile, score date | `unavailable` or `no-data` |
| GitHub Security Advisories | Direct, keyless, CORS-enabled | Critical/high GHSA disclosures, packages, versions, severity, references | `unavailable` on 403/429 rate limit |
| Exploit-DB RSS | Supabase proxy only (no CORS) | Public listing title, category, software/version hints, link, date | `not-configured` or `unavailable` |
| CISA cybersecurity advisories RSS | Supabase proxy only (no CORS) | Official advisories/alerts, CVE mentions, links | `not-configured` or `unavailable` |
| Existing Security News feeds | Existing `news-feed-proxy` | Disclosure/exploitation reports and CVE mentions | `not-configured` or `unavailable` |
| VulnCheck KEV | Not integrated — requires bearer token | None | `requires-token` with docs link |

### Source evidence rules

- **Confirmed (KEV)** is assigned only when a CVE appears in CISA KEV.
- **Reported exploitation** is assigned only when source text explicitly uses exploitation language.
- **Public exploit listing** means a CVE or record is correlated with an Exploit-DB listing; it does not mean exploitation was observed.
- **Not reported** means no integrated source reported exploitation. It is not a safety verdict.
- Exploit-DB RSS does not publish maturity, CVE IDs, or exploit code metadata. Maturity always displays `Not reported by feed`.
- Dates, severities, EPSS values, and affected versions are never synthesized. Missing fields display `Not available`, `Not scored`, or `Not reported`.

## Proxy setup

Deploy the allowlisted Edge Function:

```bash
supabase functions deploy zero-day-intel-proxy
```

Then set the public environment variable in local, production, and GitHub Actions environments:

```bash
NEXT_PUBLIC_ZERO_DAY_PROXY_URL=https://YOUR-PROJECT.supabase.co/functions/v1/zero-day-intel-proxy
```

The workflow already falls back to the existing Supabase project endpoint when no repository variable is set. The function accepts only these source identifiers in a JSON POST body:

- `cisa-kev`
- `cisa-advisories`
- `exploit-db`

It does not accept arbitrary URLs, does not require or embed a secret, enforces response size and timeout limits, and returns `ok: false` with an error message when an upstream feed fails.

`GET /functions/v1/zero-day-intel-proxy/health` lists configured sources.

## Enrichment limits

NVD and EPSS enrichment is limited to the 100 highest-priority CVEs per load. Priority is derived from KEV recency, advisory/news publication time, and critical severity; the priority score is internal ranking only and is never displayed as a risk score. This respects published NVD throttling and the EPSS batch limit while keeping the static bundle responsive.

## Features

- Intelligence dashboard: watchlist table, explicit zero-day signals, recently exploited KEV entries, alert queue, vendor panel, and source health rail.
- Exploit database: searchable, sortable, paginated Exploit-DB metadata with CVE navigation where a CVE is explicit.
- News & alerts: official advisories, GHSA disclosures, and existing news reports with confirmed / published-advisory / unverified labels.
- Vendor & product intelligence: correlated vendors, products, CVE links, exploit listings, advisories, and latest signal dates.
- Detail drawer: full provenance, CVSS, EPSS, KEV dates, versions, CWEs, references, and links to existing CVE detail pages.
- URL-synced tabs, filters, sorting, and pagination.

All views include loading, empty, unavailable-source, and error states. The UI uses native controls for keyboard access and labelled tables for assistive technology.

## Defensive scope

This module is for detection engineering, exposure review, and vulnerability prioritization. It does not provide exploit execution, payloads, step-by-step exploitation instructions, or offensive operational guidance.
