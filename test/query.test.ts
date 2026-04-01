import { describe, expect, it } from "vitest";

import { deriveStatus } from "../src/lib/normalize.js";
import { queryWebinars } from "../src/lib/query.js";
import { buildRecord } from "./helpers/record.js";

describe("query helpers", () => {
  const now = Date.parse("2026-04-01T00:00:00Z");

  it("derives past status from end time", () => {
    const record = buildRecord({
      endsAtEpochMs: Date.parse("2026-03-31T23:00:00Z")
    });

    expect(deriveStatus(record, now)).toBe("past");
  });

  it("ranks exact topic matches ahead of prefix and substring matches", () => {
    const exact = buildRecord({ id: "exact", topic: "Alpha", score: 1, trending: 1 });
    const prefix = buildRecord({ id: "prefix", topic: "Alpha Beta", score: 100, trending: 100 });
    const contains = buildRecord({
      id: "contains",
      topic: "Beta",
      description: "Includes alpha somewhere",
      score: 999,
      trending: 999
    });

    const result = queryWebinars([contains, prefix, exact], {
      page: 1,
      limit: 10,
      q: "alpha"
    }, now);

    expect(result.items.map((item) => item.id)).toEqual(["exact", "prefix", "contains"]);
  });

  it("sorts by score descending when requested", () => {
    const low = buildRecord({ id: "low", score: 1 });
    const high = buildRecord({ id: "high", score: 50 });

    const result = queryWebinars([low, high], {
      page: 1,
      limit: 10,
      sort: "score",
      order: "desc"
    }, now);

    expect(result.items.map((item) => item.id)).toEqual(["high", "low"]);
  });

  it("applies pagination metadata", () => {
    const webinars = Array.from({ length: 7 }, (_, index) =>
      buildRecord({
        id: `record-${index + 1}`,
        topic: `Topic ${index + 1}`,
        score: 100 - index
      })
    );

    const result = queryWebinars(webinars, {
      page: 2,
      limit: 3,
      sort: "score",
      order: "desc"
    }, now);

    expect(result.page).toBe(2);
    expect(result.limit).toBe(3);
    expect(result.totalItems).toBe(7);
    expect(result.totalPages).toBe(3);
    expect(result.items).toHaveLength(3);
  });
});
