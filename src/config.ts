export interface AppConfig {
  host: string;
  port: number;
  sourceUrl: string;
  cacheTtlMs: number;
  staleIfErrorMs: number;
  logLevel: string;
  rateLimitMax: number;
}

export type AppConfigOverrides = Partial<AppConfig>;

const DEFAULT_CONFIG: AppConfig = {
  host: "0.0.0.0",
  port: 3000,
  sourceUrl: "https://storage.googleapis.com/webinartv-200-webinars/webinars-200.json",
  cacheTtlMs: 15 * 60 * 1000,
  staleIfErrorMs: 24 * 60 * 60 * 1000,
  logLevel: "info",
  rateLimitMax: 120
};

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveConfig(overrides: AppConfigOverrides = {}): AppConfig {
  return {
    host: overrides.host ?? process.env.HOST ?? DEFAULT_CONFIG.host,
    port: overrides.port ?? parsePositiveInteger(process.env.PORT, DEFAULT_CONFIG.port),
    sourceUrl: overrides.sourceUrl ?? process.env.SOURCE_URL ?? DEFAULT_CONFIG.sourceUrl,
    cacheTtlMs:
      overrides.cacheTtlMs ?? parsePositiveInteger(process.env.CACHE_TTL_MS, DEFAULT_CONFIG.cacheTtlMs),
    staleIfErrorMs:
      overrides.staleIfErrorMs ??
      parsePositiveInteger(process.env.STALE_IF_ERROR_MS, DEFAULT_CONFIG.staleIfErrorMs),
    logLevel: overrides.logLevel ?? process.env.LOG_LEVEL ?? DEFAULT_CONFIG.logLevel,
    rateLimitMax:
      overrides.rateLimitMax ??
      parsePositiveInteger(process.env.RATE_LIMIT_MAX, DEFAULT_CONFIG.rateLimitMax)
  };
}
