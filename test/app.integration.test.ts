import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { loadCatalogFixture } from "./helpers/fixture.js";
import { SequenceSourceClient } from "./helpers/source-client.js";

describe("WebinarTV API integration", () => {
  const fixture = loadCatalogFixture();
  const successfulFetch = {
    kind: "ok" as const,
    catalog: fixture,
    etag: '"fixture-etag"',
    lastModified: "Mon, 07 Apr 2025 19:20:05 GMT"
  };

  it("serves health, meta, list, detail, docs, and OpenAPI routes", async () => {
    const app = await createApp({
      sourceClient: new SequenceSourceClient([successfulFetch]),
      now: () => Date.parse("2026-04-01T00:00:00Z"),
      config: {
        logLevel: "silent"
      }
    });

    try {
      const health = await app.inject({ method: "GET", url: "/healthz" });
      expect(health.statusCode).toBe(200);
      expect(health.json()).toEqual({ status: "ok" });

      const meta = await app.inject({ method: "GET", url: "/v1/meta" });
      expect(meta.statusCode).toBe(200);
      expect(meta.headers["x-cache-state"]).toBe("fresh");
      expect(meta.json().data.rawRowCount).toBe(400);
      expect(meta.json().data.uniqueWebinarCount).toBe(200);

      const categories = await app.inject({ method: "GET", url: "/v1/categories" });
      expect(categories.statusCode).toBe(200);
      expect(categories.json()).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Business" })]));

      const webinars = await app.inject({
        method: "GET",
        url: "/v1/webinars?category=Business&status=past&limit=5"
      });
      expect(webinars.statusCode).toBe(200);
      expect(webinars.json().items).toHaveLength(5);
      expect(webinars.json().items.every((item: { category: string; status: string }) => item.category === "Business")).toBe(
        true
      );
      expect(webinars.json().items.every((item: { status: string }) => item.status === "past")).toBe(true);

      const firstWebinarId = webinars.json().items[0].id as string;
      const detail = await app.inject({ method: "GET", url: `/v1/webinars/${firstWebinarId}` });
      expect(detail.statusCode).toBe(200);
      expect(detail.json().raw.sourceVariants.trending).toBeTruthy();
      expect(detail.json().raw.sourceVariants.category).toBeTruthy();

      const openapi = await app.inject({ method: "GET", url: "/openapi.json" });
      expect(openapi.statusCode).toBe(200);
      expect(openapi.json().openapi).toBeDefined();

      const docs = await app.inject({ method: "GET", url: "/docs/" });
      expect(docs.statusCode).toBe(200);
      expect(docs.body).toContain("Swagger UI");
    } finally {
      await app.close();
    }
  });

  it("returns 404 when a webinar id is missing", async () => {
    const app = await createApp({
      sourceClient: new SequenceSourceClient([successfulFetch]),
      now: () => Date.parse("2026-04-01T00:00:00Z"),
      config: {
        logLevel: "silent"
      }
    });

    try {
      const response = await app.inject({ method: "GET", url: "/v1/webinars/does-not-exist" });
      expect(response.statusCode).toBe(404);
      expect(response.json().code).toBe("WEBINAR_NOT_FOUND");
    } finally {
      await app.close();
    }
  });

  it("returns validation errors for invalid query params", async () => {
    const app = await createApp({
      sourceClient: new SequenceSourceClient([successfulFetch]),
      config: {
        logLevel: "silent"
      }
    });

    try {
      const response = await app.inject({ method: "GET", url: "/v1/webinars?limit=101" });
      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe("VALIDATION_ERROR");
    } finally {
      await app.close();
    }
  });

  it("serves stale data when refresh fails after a warm cache", async () => {
    let currentNow = 1_000;
    const app = await createApp({
      sourceClient: new SequenceSourceClient([successfulFetch, new Error("upstream down")]),
      now: () => currentNow,
      config: {
        cacheTtlMs: 1,
        staleIfErrorMs: 10_000,
        logLevel: "silent"
      }
    });

    try {
      const first = await app.inject({ method: "GET", url: "/v1/meta" });
      expect(first.statusCode).toBe(200);
      expect(first.headers["x-cache-state"]).toBe("fresh");

      currentNow = 2_000;
      const second = await app.inject({ method: "GET", url: "/v1/meta" });
      expect(second.statusCode).toBe(200);
      expect(second.headers["x-cache-state"]).toBe("stale");
      expect(second.json().cache.state).toBe("stale");
    } finally {
      await app.close();
    }
  });

  it("returns 503 when the source is unavailable on cold start", async () => {
    const app = await createApp({
      sourceClient: new SequenceSourceClient([new Error("upstream down")]),
      config: {
        logLevel: "silent"
      }
    });

    try {
      const response = await app.inject({ method: "GET", url: "/v1/meta" });
      expect(response.statusCode).toBe(503);
      expect(response.json().code).toBe("SOURCE_UNAVAILABLE");
    } finally {
      await app.close();
    }
  });
});
