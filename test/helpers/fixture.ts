import { readFileSync } from "node:fs";

import type { RawCatalog } from "../../src/types/webinar.js";

let cachedFixture: RawCatalog | null = null;

export function loadCatalogFixture(): RawCatalog {
  if (cachedFixture) {
    return cachedFixture;
  }

  const fixturePath = new URL("../fixtures/webinars-200.fixture.json", import.meta.url);
  cachedFixture = JSON.parse(readFileSync(fixturePath, "utf8")) as RawCatalog;
  return cachedFixture;
}
