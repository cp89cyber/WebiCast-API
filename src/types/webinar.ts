import { Type, type Static, type TSchema } from "@sinclair/typebox";

export type WebinarStatus = "upcoming" | "past";
export type WebinarSortField = "trending" | "start_time" | "score" | "topic";
export type SortOrder = "asc" | "desc";

export interface RawWebinar extends Record<string, unknown> {
  id: string;
}

export type RawCatalog = Record<string, RawWebinar[]>;

export interface CategoryCount {
  slug: string;
  name: string;
  count: number;
}

export interface WebinarHost {
  id: string | null;
  code: string | null;
  name: string | null;
  exists: boolean | null;
  registerEmail: string | null;
}

export interface WebinarMedia {
  graphic: string | null;
  webinarBanner: string | null;
  customImage: string | null;
  recordedUrl: string | null;
  hasGraphic: boolean;
  hasBanner: boolean;
  hasCustomImage: boolean;
}

export interface WebinarFlags {
  over: boolean;
  overWeb: boolean | null;
  success: number | null;
  record: number | null;
  searchAdded: boolean | null;
  hostExists: boolean | null;
  existingHost: boolean | null;
  subcategoryExists: boolean | null;
}

export interface WebinarSourceMeta {
  categoryBucket: string | null;
  sourceBuckets: string[];
  variantCount: number;
}

export interface WebinarRawData {
  merged: RawWebinar;
  sourceVariants: {
    trending: RawWebinar | null;
    category: RawWebinar | null;
  };
}

export interface NormalizedWebinarRecord {
  id: string;
  topic: string;
  description: string;
  category: string;
  categories: string[];
  sourceBuckets: string[];
  startsAtEpochMs: number | null;
  endsAtEpochMs: number | null;
  timeText: string | null;
  registrationUrl: string | null;
  joinUrl: string | null;
  providerHost: string | null;
  score: number | null;
  trending: number | null;
  easyStars: number | null;
  highDemandStars: number | null;
  hasRecording: boolean;
  isRegisterRequired: boolean;
  overFlag: boolean;
  host: WebinarHost;
  media: WebinarMedia;
  flags: WebinarFlags;
  sourceMeta: WebinarSourceMeta;
  raw: WebinarRawData;
}

export interface WebinarSummary {
  id: string;
  topic: string;
  description: string;
  category: string;
  categories: string[];
  sourceBuckets: string[];
  status: WebinarStatus;
  startsAt: string | null;
  endsAt: string | null;
  timeText: string | null;
  registrationUrl: string | null;
  joinUrl: string | null;
  providerHost: string | null;
  score: number | null;
  trending: number | null;
  easyStars: number | null;
  highDemandStars: number | null;
  hasRecording: boolean;
  isRegisterRequired: boolean;
  isPast: boolean;
}

export interface WebinarDetail extends WebinarSummary {
  host: WebinarHost;
  media: WebinarMedia;
  flags: WebinarFlags;
  sourceMeta: WebinarSourceMeta;
  raw: WebinarRawData;
}

export interface NormalizedCatalog {
  webinars: NormalizedWebinarRecord[];
  byId: Map<string, NormalizedWebinarRecord>;
  rawRowCount: number;
  uniqueWebinarCount: number;
  categoryCounts: Record<string, number>;
  categories: CategoryCount[];
}

const NullableString = Type.Union([Type.String(), Type.Null()]);
const NullableNumber = Type.Union([Type.Number(), Type.Null()]);
const NullableBoolean = Type.Union([Type.Boolean(), Type.Null()]);
const RawObjectSchema = Type.Object({}, { additionalProperties: true });
const NullableRawObject = Type.Union([RawObjectSchema, Type.Null()]);

export const ErrorResponseSchema = Type.Object({
  code: Type.String(),
  message: Type.String(),
  details: Type.Optional(Type.String())
});

export const CategorySchema = Type.Object({
  slug: Type.String(),
  name: Type.String(),
  count: Type.Integer({ minimum: 0 })
});

export const WebinarSummarySchema = Type.Object({
  id: Type.String(),
  topic: Type.String(),
  description: Type.String(),
  category: Type.String(),
  categories: Type.Array(Type.String()),
  sourceBuckets: Type.Array(Type.String()),
  status: Type.Union([Type.Literal("upcoming"), Type.Literal("past")]),
  startsAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  endsAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  timeText: NullableString,
  registrationUrl: NullableString,
  joinUrl: NullableString,
  providerHost: NullableString,
  score: NullableNumber,
  trending: NullableNumber,
  easyStars: NullableNumber,
  highDemandStars: NullableNumber,
  hasRecording: Type.Boolean(),
  isRegisterRequired: Type.Boolean(),
  isPast: Type.Boolean()
});

export const WebinarHostSchema = Type.Object({
  id: NullableString,
  code: NullableString,
  name: NullableString,
  exists: NullableBoolean,
  registerEmail: NullableString
});

export const WebinarMediaSchema = Type.Object({
  graphic: NullableString,
  webinarBanner: NullableString,
  customImage: NullableString,
  recordedUrl: NullableString,
  hasGraphic: Type.Boolean(),
  hasBanner: Type.Boolean(),
  hasCustomImage: Type.Boolean()
});

export const WebinarFlagsSchema = Type.Object({
  over: Type.Boolean(),
  overWeb: NullableBoolean,
  success: NullableNumber,
  record: NullableNumber,
  searchAdded: NullableBoolean,
  hostExists: NullableBoolean,
  existingHost: NullableBoolean,
  subcategoryExists: NullableBoolean
});

export const WebinarSourceMetaSchema = Type.Object({
  categoryBucket: NullableString,
  sourceBuckets: Type.Array(Type.String()),
  variantCount: Type.Integer({ minimum: 0 })
});

export const WebinarRawDataSchema = Type.Object({
  merged: RawObjectSchema,
  sourceVariants: Type.Object({
    trending: NullableRawObject,
    category: NullableRawObject
  })
});

export const WebinarDetailSchema = Type.Composite([
  WebinarSummarySchema,
  Type.Object({
    host: WebinarHostSchema,
    media: WebinarMediaSchema,
    flags: WebinarFlagsSchema,
    sourceMeta: WebinarSourceMetaSchema,
    raw: WebinarRawDataSchema
  })
]);

export const MetaResponseSchema = Type.Object({
  source: Type.Object({
    url: Type.String({ format: "uri" }),
    etag: NullableString,
    lastModified: NullableString
  }),
  cache: Type.Object({
    state: Type.Union([Type.Literal("fresh"), Type.Literal("stale")]),
    lastAttemptAt: NullableString,
    lastRefreshAt: NullableString,
    expiresAt: NullableString,
    ttlMs: Type.Integer({ minimum: 1 }),
    staleIfErrorMs: Type.Integer({ minimum: 1 })
  }),
  data: Type.Object({
    rawRowCount: Type.Integer({ minimum: 0 }),
    uniqueWebinarCount: Type.Integer({ minimum: 0 }),
    categoryCounts: Type.Record(Type.String(), Type.Integer({ minimum: 0 })),
    categories: Type.Array(CategorySchema)
  })
});

export const HealthResponseSchema = Type.Object({
  status: Type.Literal("ok")
});

export function createPaginatedResponseSchema<T extends TSchema>(itemSchema: T) {
  return Type.Object({
    items: Type.Array(itemSchema),
    page: Type.Integer({ minimum: 1 }),
    limit: Type.Integer({ minimum: 1 }),
    totalItems: Type.Integer({ minimum: 0 }),
    totalPages: Type.Integer({ minimum: 0 })
  });
}

export type ErrorResponse = Static<typeof ErrorResponseSchema>;
export type MetaResponse = Static<typeof MetaResponseSchema>;
export type HealthResponse = Static<typeof HealthResponseSchema>;

export function slugifyCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
