import type {
  NormalizedWebinarRecord,
  SortOrder,
  WebinarSortField,
  WebinarStatus,
  WebinarSummary
} from "../types/webinar.js";
import { slugifyCategory } from "../types/webinar.js";
import { deriveStatus, toWebinarSummary } from "./normalize.js";

export interface WebinarListQuery {
  page: number;
  limit: number;
  category?: string;
  status?: "all" | WebinarStatus;
  q?: string;
  sort?: WebinarSortField;
  order?: SortOrder;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

function compareNullableNumbers(left: number | null, right: number | null, order: SortOrder): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return order === "asc" ? left - right : right - left;
}

function defaultSort(left: NormalizedWebinarRecord, right: NormalizedWebinarRecord): number {
  return (
    compareNullableNumbers(left.trending, right.trending, "desc") ||
    compareNullableNumbers(left.score, right.score, "desc") ||
    compareNullableNumbers(left.startsAtEpochMs, right.startsAtEpochMs, "asc") ||
    left.topic.localeCompare(right.topic)
  );
}

function defaultOrderForSort(sort: WebinarSortField): SortOrder {
  return sort === "topic" || sort === "start_time" ? "asc" : "desc";
}

function compareBySort(
  left: NormalizedWebinarRecord,
  right: NormalizedWebinarRecord,
  sort: WebinarSortField,
  order: SortOrder
): number {
  switch (sort) {
    case "start_time":
      return compareNullableNumbers(left.startsAtEpochMs, right.startsAtEpochMs, order) || defaultSort(left, right);
    case "score":
      return compareNullableNumbers(left.score, right.score, order) || defaultSort(left, right);
    case "topic":
      return (
        (order === "asc"
          ? left.topic.localeCompare(right.topic)
          : right.topic.localeCompare(left.topic)) || defaultSort(left, right)
      );
    case "trending":
      return compareNullableNumbers(left.trending, right.trending, order) || defaultSort(left, right);
  }
}

function computeSearchRank(record: NormalizedWebinarRecord, query: string): number | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return 2;
  }

  const topic = record.topic.toLowerCase();
  if (topic === normalizedQuery) {
    return 0;
  }

  if (topic.startsWith(normalizedQuery)) {
    return 1;
  }

  const haystack = [
    record.topic,
    record.description,
    record.category,
    ...record.categories,
    record.host.name ?? "",
    record.raw.merged.subcategories,
    record.raw.merged.speakers
  ]
    .flatMap((value) => {
      if (typeof value === "string") {
        return [value];
      }

      if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === "string");
      }

      return [];
    })
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery) ? 2 : null;
}

function matchesCategory(record: NormalizedWebinarRecord, category: string | undefined): boolean {
  if (!category) {
    return true;
  }

  const normalizedCategory = slugifyCategory(category);
  return slugifyCategory(record.category) === normalizedCategory;
}

function matchesStatus(record: NormalizedWebinarRecord, status: "all" | WebinarStatus | undefined, now: number): boolean {
  if (!status || status === "all") {
    return true;
  }

  return deriveStatus(record, now) === status;
}

function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const totalItems = items.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);
  const start = (page - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    page,
    limit,
    totalItems,
    totalPages
  };
}

export function queryWebinars(
  webinars: NormalizedWebinarRecord[],
  query: WebinarListQuery,
  now: number
): PaginatedResponse<WebinarSummary> {
  const filtered = webinars.filter((record) => {
    return matchesCategory(record, query.category) && matchesStatus(record, query.status, now);
  });

  const searchQuery = query.q?.trim();
  const ranked = searchQuery
    ? filtered
        .map((record) => ({
          record,
          rank: computeSearchRank(record, searchQuery)
        }))
        .filter((entry): entry is { record: NormalizedWebinarRecord; rank: number } => entry.rank !== null)
    : filtered.map((record) => ({ record, rank: 2 }));

  const sorted = ranked.sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    if (!query.sort) {
      return defaultSort(left.record, right.record);
    }

    const order = query.order ?? defaultOrderForSort(query.sort);
    return compareBySort(left.record, right.record, query.sort, order);
  });

  const page = paginate(
    sorted.map(({ record }) => toWebinarSummary(record, now)),
    query.page,
    query.limit
  );

  return page;
}
