import type {
  CategoryCount,
  NormalizedCatalog,
  NormalizedWebinarRecord,
  RawCatalog,
  RawWebinar,
  WebinarDetail,
  WebinarStatus,
  WebinarSummary
} from "../types/webinar.js";
import { slugifyCategory } from "../types/webinar.js";

const TRENDING_BUCKET = "trending";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asBooleanFlag(value: unknown): boolean {
  return value === true;
}

function asEpochMilliseconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function deriveProviderHost(url: string | null): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function mergeMissingFields(base: RawWebinar, fallback: RawWebinar | null): RawWebinar {
  if (!fallback) {
    return { ...base };
  }

  const merged: RawWebinar = { ...base };
  for (const [key, value] of Object.entries(fallback)) {
    if (!(key in merged) || merged[key] === null || merged[key] === undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

function sortSourceBuckets(buckets: Iterable<string>): string[] {
  return [...new Set(buckets)].sort((left, right) => {
    if (left === TRENDING_BUCKET && right !== TRENDING_BUCKET) {
      return -1;
    }

    if (left !== TRENDING_BUCKET && right === TRENDING_BUCKET) {
      return 1;
    }

    return left.localeCompare(right);
  });
}

function buildCategories(merged: RawWebinar, category: string): string[] {
  const explicitCategories = asStringArray(merged.categories);
  const unique = new Set(explicitCategories);

  if (category) {
    unique.add(category);
  }

  return [...unique];
}

export function deriveStatus(record: Pick<NormalizedWebinarRecord, "endsAtEpochMs" | "overFlag">, now: number): WebinarStatus {
  if (record.overFlag) {
    return "past";
  }

  if (record.endsAtEpochMs !== null && record.endsAtEpochMs < now) {
    return "past";
  }

  return "upcoming";
}

function toIsoString(epochMs: number | null): string | null {
  return epochMs === null ? null : new Date(epochMs).toISOString();
}

export function toWebinarSummary(record: NormalizedWebinarRecord, now: number): WebinarSummary {
  const status = deriveStatus(record, now);

  return {
    id: record.id,
    topic: record.topic,
    description: record.description,
    category: record.category,
    categories: record.categories,
    sourceBuckets: record.sourceBuckets,
    status,
    startsAt: toIsoString(record.startsAtEpochMs),
    endsAt: toIsoString(record.endsAtEpochMs),
    timeText: record.timeText,
    registrationUrl: record.registrationUrl,
    joinUrl: record.joinUrl,
    providerHost: record.providerHost,
    score: record.score,
    trending: record.trending,
    easyStars: record.easyStars,
    highDemandStars: record.highDemandStars,
    hasRecording: record.hasRecording,
    isRegisterRequired: record.isRegisterRequired,
    isPast: status === "past"
  };
}

export function toWebinarDetail(record: NormalizedWebinarRecord, now: number): WebinarDetail {
  return {
    ...toWebinarSummary(record, now),
    host: record.host,
    media: record.media,
    flags: record.flags,
    sourceMeta: record.sourceMeta,
    raw: record.raw
  };
}

export function normalizeCatalog(catalog: RawCatalog): NormalizedCatalog {
  const groupedById = new Map<
    string,
    {
      buckets: string[];
      byBucket: Map<string, RawWebinar>;
    }
  >();

  let rawRowCount = 0;

  for (const [bucket, items] of Object.entries(catalog)) {
    for (const item of items) {
      rawRowCount += 1;
      const existing = groupedById.get(item.id) ?? { buckets: [], byBucket: new Map<string, RawWebinar>() };
      existing.buckets.push(bucket);
      existing.byBucket.set(bucket, item);
      groupedById.set(item.id, existing);
    }
  }

  const webinars: NormalizedWebinarRecord[] = [];
  const byId = new Map<string, NormalizedWebinarRecord>();
  const categoryCounts = new Map<string, number>();

  for (const [id, grouped] of groupedById.entries()) {
    const categoryBucket =
      sortSourceBuckets(grouped.buckets).find((bucket) => bucket !== TRENDING_BUCKET) ?? null;
    const categoryVariant = categoryBucket ? grouped.byBucket.get(categoryBucket) ?? null : null;
    const trendingVariant = grouped.byBucket.get(TRENDING_BUCKET) ?? null;
    const baseRecord = categoryVariant ?? trendingVariant;

    if (!baseRecord) {
      continue;
    }

    const merged = mergeMissingFields(baseRecord, trendingVariant);
    const explicitCategory = asString(merged.category);
    const categories = asStringArray(merged.categories);
    const category = explicitCategory ?? categories[0] ?? categoryBucket ?? "Unknown";
    const sourceBuckets = sortSourceBuckets(grouped.buckets);

    const record: NormalizedWebinarRecord = {
      id,
      topic: asString(merged.topic) ?? "",
      description: asString(merged.description) ?? "",
      category,
      categories: buildCategories(merged, category),
      sourceBuckets,
      startsAtEpochMs: asEpochMilliseconds(merged.meetingStartTime),
      endsAtEpochMs: asEpochMilliseconds(merged.meetingEndTime),
      timeText: asString(merged.time),
      registrationUrl: asString(merged.url),
      joinUrl: asString(merged.joinUrl),
      providerHost: deriveProviderHost(asString(merged.url)),
      score: asNumber(merged.score),
      trending: asNumber(merged.trending),
      easyStars: asNumber(merged.easyStars),
      highDemandStars: asNumber(merged.highDemandStars),
      hasRecording:
        asString(merged.recordedUrl) !== null || asBooleanFlag(merged.showRecording) || asNumber(merged.record) === 1,
      isRegisterRequired: asNumber(merged.register) === 1,
      overFlag: asBooleanFlag(merged.over),
      host: {
        id: asString(merged.hostId),
        code: asString(merged.hostCode),
        name: asString(merged.name),
        exists: asBoolean(merged.hostExists),
        registerEmail: asString(merged.registerEmail)
      },
      media: {
        graphic: asString(merged.graphic),
        webinarBanner: asString(merged.webinarBanner),
        customImage: asString(merged.customImage),
        recordedUrl: asString(merged.recordedUrl),
        hasGraphic: asString(merged.graphic) !== null,
        hasBanner: asString(merged.webinarBanner) !== null,
        hasCustomImage: asString(merged.customImage) !== null
      },
      flags: {
        over: asBooleanFlag(merged.over),
        overWeb: asBoolean(merged.overWeb),
        success: asNumber(merged.success),
        record: asNumber(merged.record),
        searchAdded: asBoolean(merged.searchAdded),
        hostExists: asBoolean(merged.hostExists),
        existingHost: asBoolean(merged.existingHost),
        subcategoryExists: asBoolean(merged.subcategoryExists)
      },
      sourceMeta: {
        categoryBucket,
        sourceBuckets,
        variantCount: sourceBuckets.length
      },
      raw: {
        merged,
        sourceVariants: {
          trending: trendingVariant,
          category: categoryVariant
        }
      }
    };

    webinars.push(record);
    byId.set(record.id, record);
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  const categories: CategoryCount[] = [...categoryCounts.entries()]
    .map(([name, count]) => ({
      slug: slugifyCategory(name),
      name,
      count
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    webinars,
    byId,
    rawRowCount,
    uniqueWebinarCount: webinars.length,
    categoryCounts: Object.fromEntries(categoryCounts.entries()),
    categories
  };
}
