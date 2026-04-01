import type { NormalizedWebinarRecord } from "../../src/types/webinar.js";

export function buildRecord(overrides: Partial<NormalizedWebinarRecord> = {}): NormalizedWebinarRecord {
  return {
    id: overrides.id ?? "record-1",
    topic: overrides.topic ?? "Sample Topic",
    description: overrides.description ?? "Sample Description",
    category: overrides.category ?? "Business",
    categories: overrides.categories ?? ["Business"],
    sourceBuckets: overrides.sourceBuckets ?? ["trending", "Business"],
    startsAtEpochMs: overrides.startsAtEpochMs ?? Date.parse("2026-04-10T10:00:00Z"),
    endsAtEpochMs: overrides.endsAtEpochMs ?? Date.parse("2026-04-10T11:00:00Z"),
    timeText: overrides.timeText ?? "Apr 10, 2026 10:00 AM UTC",
    registrationUrl: overrides.registrationUrl ?? "https://example.com/register",
    joinUrl: overrides.joinUrl ?? "https://example.com/join",
    providerHost: overrides.providerHost ?? "example.com",
    score: overrides.score ?? 10,
    trending: overrides.trending ?? 5,
    easyStars: overrides.easyStars ?? 3,
    highDemandStars: overrides.highDemandStars ?? 1,
    hasRecording: overrides.hasRecording ?? false,
    isRegisterRequired: overrides.isRegisterRequired ?? true,
    overFlag: overrides.overFlag ?? false,
    host: overrides.host ?? {
      id: "host-1",
      code: "host-code",
      name: "Host Name",
      exists: true,
      registerEmail: "host@example.com"
    },
    media: overrides.media ?? {
      graphic: null,
      webinarBanner: null,
      customImage: null,
      recordedUrl: null,
      hasGraphic: false,
      hasBanner: false,
      hasCustomImage: false
    },
    flags: overrides.flags ?? {
      over: false,
      overWeb: null,
      success: null,
      record: null,
      searchAdded: null,
      hostExists: true,
      existingHost: null,
      subcategoryExists: null
    },
    sourceMeta: overrides.sourceMeta ?? {
      categoryBucket: "Business",
      sourceBuckets: ["trending", "Business"],
      variantCount: 2
    },
    raw: overrides.raw ?? {
      merged: { id: overrides.id ?? "record-1" },
      sourceVariants: {
        trending: { id: overrides.id ?? "record-1" },
        category: { id: overrides.id ?? "record-1" }
      }
    }
  };
}
