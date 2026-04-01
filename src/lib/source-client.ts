import { fetch } from "undici";

import { AppError } from "./errors.js";
import type { RawCatalog } from "../types/webinar.js";

export interface FetchCatalogInput {
  etag?: string | null;
  lastModified?: string | null;
}

export interface SourceClient {
  fetchCatalog(input?: FetchCatalogInput): Promise<SourceFetchResult>;
}

export type SourceFetchResult =
  | {
      kind: "not-modified";
      etag: string | null;
      lastModified: string | null;
    }
  | {
      kind: "ok";
      catalog: RawCatalog;
      etag: string | null;
      lastModified: string | null;
    };

export interface WebinarTvSourceClientOptions {
  sourceUrl: string;
}

function isRawCatalog(value: unknown): value is RawCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((bucket) => Array.isArray(bucket));
}

export class WebinarTvSourceClient implements SourceClient {
  private readonly sourceUrl: string;

  public constructor(options: WebinarTvSourceClientOptions) {
    this.sourceUrl = options.sourceUrl;
  }

  public async fetchCatalog(input: FetchCatalogInput = {}): Promise<SourceFetchResult> {
    const headers = new Headers();

    if (input.etag) {
      headers.set("If-None-Match", input.etag);
    }

    if (input.lastModified) {
      headers.set("If-Modified-Since", input.lastModified);
    }

    const response = await fetch(this.sourceUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10_000)
    });

    if (response.status === 304) {
      return {
        kind: "not-modified",
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified")
      };
    }

    if (!response.ok) {
      const responseBody = await response.text();
      throw new AppError("SOURCE_FETCH_FAILED", 503, "Failed to fetch WebinarTV source data.", {
        details: `Source responded with ${response.status}: ${responseBody.slice(0, 200)}`
      });
    }

    const body = (await response.json()) as unknown;
    if (!isRawCatalog(body)) {
      throw new AppError("INVALID_SOURCE_PAYLOAD", 503, "WebinarTV source returned an unexpected payload.");
    }

    return {
      kind: "ok",
      catalog: body,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified")
    };
  }
}
