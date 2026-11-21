import {
  CveCacheEntry,
  DEFAULT_CACHE_TTL_MS,
  isCveCacheExpired,
  createCveCacheEntry,
} from "../types";

export { DEFAULT_CACHE_TTL_MS };

class CveMemoryCache {
  private cache: Map<string, CveCacheEntry<unknown>> = new Map();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CveCacheEntry<T> | undefined;
    if (!entry) return null;
    if (isCveCacheExpired(entry)) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number = DEFAULT_CACHE_TTL_MS): void {
    this.cache.set(key, createCveCacheEntry(data, ttlMs));
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (isCveCacheExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    let valid = 0;
    for (const [key, entry] of this.cache) {
      if (!isCveCacheExpired(entry)) {
        valid += 1;
      } else {
        this.cache.delete(key);
      }
    }
    return valid;
  }

  keys(): string[] {
    const validKeys: string[] = [];
    for (const [key, entry] of this.cache) {
      if (!isCveCacheExpired(entry)) {
        validKeys.push(key);
      } else {
        this.cache.delete(key);
      }
    }
    return validKeys;
  }
}

export const cveCache = new CveMemoryCache();

export function cacheKey(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts].join(":");
}

export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_CACHE_TTL_MS,
): Promise<T> {
  const cached = cveCache.get<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return fetcher().then((data) => {
    cveCache.set(key, data, ttlMs);
    return data;
  });
}
