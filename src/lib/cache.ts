import { AppError } from "./errors.js";
import { normalizeCatalog } from "./normalize.js";
import type { SourceClient } from "./source-client.js";
import type { NormalizedCatalog } from "../types/webinar.js";

export interface CatalogCacheOptions {
  sourceClient: SourceClient;
  sourceUrl: string;
  cacheTtlMs: number;
  staleIfErrorMs: number;
  now?: () => number;
}

interface CachedCatalogState {
  catalog: NormalizedCatalog;
  etag: string | null;
  lastModified: string | null;
  expiresAt: number;
  lastAttemptAt: number;
  lastRefreshAt: number;
}

export interface CatalogSnapshot {
  catalog: NormalizedCatalog;
  source: {
    url: string;
    etag: string | null;
    lastModified: string | null;
  };
  cache: {
    state: "fresh" | "stale";
    lastAttemptAt: string | null;
    lastRefreshAt: string | null;
    expiresAt: string | null;
    ttlMs: number;
    staleIfErrorMs: number;
  };
}

function toIsoString(timestamp: number | null | undefined): string | null {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

export class CatalogCache {
  private readonly sourceClient: SourceClient;
  private readonly sourceUrl: string;
  private readonly cacheTtlMs: number;
  private readonly staleIfErrorMs: number;
  private readonly now: () => number;
  private current: CachedCatalogState | null = null;
  private refreshPromise: Promise<CatalogSnapshot> | null = null;

  public constructor(options: CatalogCacheOptions) {
    this.sourceClient = options.sourceClient;
    this.sourceUrl = options.sourceUrl;
    this.cacheTtlMs = options.cacheTtlMs;
    this.staleIfErrorMs = options.staleIfErrorMs;
    this.now = options.now ?? Date.now;
  }

  public async getSnapshot(): Promise<CatalogSnapshot> {
    const now = this.now();
    if (this.current && this.current.expiresAt > now) {
      return this.createSnapshot(this.current, "fresh");
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refresh(): Promise<CatalogSnapshot> {
    const now = this.now();

    try {
      const result = await this.sourceClient.fetchCatalog({
        etag: this.current?.etag ?? null,
        lastModified: this.current?.lastModified ?? null
      });

      if (result.kind === "not-modified") {
        if (!this.current) {
          throw new AppError("INVALID_SOURCE_STATE", 503, "Source returned 304 without a warm cache.");
        }

        this.current = {
          ...this.current,
          etag: result.etag ?? this.current.etag,
          lastModified: result.lastModified ?? this.current.lastModified,
          expiresAt: now + this.cacheTtlMs,
          lastAttemptAt: now
        };

        return this.createSnapshot(this.current, "fresh");
      }

      const catalog = normalizeCatalog(result.catalog);
      this.current = {
        catalog,
        etag: result.etag,
        lastModified: result.lastModified,
        expiresAt: now + this.cacheTtlMs,
        lastAttemptAt: now,
        lastRefreshAt: now
      };

      return this.createSnapshot(this.current, "fresh");
    } catch (error) {
      if (this.current && now - this.current.lastRefreshAt <= this.staleIfErrorMs) {
        this.current = {
          ...this.current,
          lastAttemptAt: now
        };

        return this.createSnapshot(this.current, "stale");
      }

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("SOURCE_UNAVAILABLE", 503, "WebinarTV source data is currently unavailable.", {
        details: error instanceof Error ? error.message : "Unknown source failure."
      });
    }
  }

  private createSnapshot(state: CachedCatalogState, cacheState: "fresh" | "stale"): CatalogSnapshot {
    return {
      catalog: state.catalog,
      source: {
        url: this.sourceUrl,
        etag: state.etag,
        lastModified: state.lastModified
      },
      cache: {
        state: cacheState,
        lastAttemptAt: toIsoString(state.lastAttemptAt),
        lastRefreshAt: toIsoString(state.lastRefreshAt),
        expiresAt: toIsoString(state.expiresAt),
        ttlMs: this.cacheTtlMs,
        staleIfErrorMs: this.staleIfErrorMs
      }
    };
  }
}
