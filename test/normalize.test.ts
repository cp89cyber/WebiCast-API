import { describe, expect, it } from "vitest";

import { normalizeCatalog } from "../src/lib/normalize.js";
import { loadCatalogFixture } from "./helpers/fixture.js";

describe("normalizeCatalog", () => {
  it("deduplicates the public fixture into 200 unique webinars", () => {
    const fixture = loadCatalogFixture();
    const catalog = normalizeCatalog(fixture);

    expect(catalog.rawRowCount).toBe(400);
    expect(catalog.uniqueWebinarCount).toBe(200);
    expect(catalog.webinars).toHaveLength(200);
    expect(catalog.categories.reduce((total, category) => total + category.count, 0)).toBe(200);
  });

  it("preserves exactly two source buckets per normalized webinar", () => {
    const fixture = loadCatalogFixture();
    const catalog = normalizeCatalog(fixture);

    for (const webinar of catalog.webinars) {
      expect(webinar.sourceBuckets).toHaveLength(2);
      expect(webinar.sourceBuckets).toContain("trending");
      expect(webinar.sourceMeta.variantCount).toBe(2);
      expect(webinar.raw.sourceVariants.trending).not.toBeNull();
      expect(webinar.raw.sourceVariants.category).not.toBeNull();
    }
  });
});
