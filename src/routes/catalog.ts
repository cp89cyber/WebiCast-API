import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance, FastifyReply } from "fastify";

import type { CatalogCache, CatalogSnapshot } from "../lib/cache.js";
import { AppError } from "../lib/errors.js";
import { queryWebinars } from "../lib/query.js";
import { toWebinarDetail } from "../lib/normalize.js";
import {
  CategorySchema,
  ErrorResponseSchema,
  MetaResponseSchema,
  WebinarDetailSchema,
  WebinarSummarySchema,
  createPaginatedResponseSchema
} from "../types/webinar.js";

const WebinarsQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 25 })),
  category: Type.Optional(Type.String()),
  status: Type.Optional(Type.Union([Type.Literal("all"), Type.Literal("upcoming"), Type.Literal("past")], { default: "all" })),
  q: Type.Optional(Type.String()),
  sort: Type.Optional(
    Type.Union([
      Type.Literal("trending"),
      Type.Literal("start_time"),
      Type.Literal("score"),
      Type.Literal("topic")
    ])
  ),
  order: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")]))
});

const WebinarParamsSchema = Type.Object({
  id: Type.String()
});

type WebinarsQuery = Static<typeof WebinarsQuerySchema>;
type WebinarParams = Static<typeof WebinarParamsSchema>;

function applySnapshotHeaders(reply: FastifyReply, snapshot: CatalogSnapshot): void {
  reply.header("x-cache-state", snapshot.cache.state);

  if (snapshot.source.etag) {
    reply.header("x-source-etag", snapshot.source.etag);
  }

  if (snapshot.source.lastModified) {
    reply.header("x-source-last-modified", snapshot.source.lastModified);
  }
}

export interface CatalogRouteOptions {
  cache: CatalogCache;
  now?: () => number;
}

export async function registerCatalogRoutes(app: FastifyInstance, options: CatalogRouteOptions): Promise<void> {
  const now = options.now ?? Date.now;

  app.get(
    "/v1/meta",
    {
      schema: {
        tags: ["Catalog"],
        response: {
          200: MetaResponseSchema,
          503: ErrorResponseSchema
        }
      }
    },
    async (_request, reply) => {
      const snapshot = await options.cache.getSnapshot();
      applySnapshotHeaders(reply, snapshot);

      return {
        source: snapshot.source,
        cache: snapshot.cache,
        data: {
          rawRowCount: snapshot.catalog.rawRowCount,
          uniqueWebinarCount: snapshot.catalog.uniqueWebinarCount,
          categoryCounts: snapshot.catalog.categoryCounts,
          categories: snapshot.catalog.categories
        }
      };
    }
  );

  app.get(
    "/v1/categories",
    {
      schema: {
        tags: ["Catalog"],
        response: {
          200: Type.Array(CategorySchema),
          503: ErrorResponseSchema
        }
      }
    },
    async (_request, reply) => {
      const snapshot = await options.cache.getSnapshot();
      applySnapshotHeaders(reply, snapshot);
      return snapshot.catalog.categories;
    }
  );

  app.get<{ Querystring: WebinarsQuery }>(
    "/v1/webinars",
    {
      schema: {
        tags: ["Catalog"],
        querystring: WebinarsQuerySchema,
        response: {
          200: createPaginatedResponseSchema(WebinarSummarySchema),
          400: ErrorResponseSchema,
          503: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      const snapshot = await options.cache.getSnapshot();
      applySnapshotHeaders(reply, snapshot);

      return queryWebinars(snapshot.catalog.webinars, {
        page: request.query.page ?? 1,
        limit: request.query.limit ?? 25,
        ...(request.query.category ? { category: request.query.category } : {}),
        ...(request.query.status ? { status: request.query.status } : {}),
        ...(request.query.q ? { q: request.query.q } : {}),
        ...(request.query.sort ? { sort: request.query.sort } : {}),
        ...(request.query.order ? { order: request.query.order } : {})
      }, now());
    }
  );

  app.get<{ Params: WebinarParams }>(
    "/v1/webinars/:id",
    {
      schema: {
        tags: ["Catalog"],
        params: WebinarParamsSchema,
        response: {
          200: WebinarDetailSchema,
          404: ErrorResponseSchema,
          503: ErrorResponseSchema
        }
      }
    },
    async (request, reply) => {
      const snapshot = await options.cache.getSnapshot();
      applySnapshotHeaders(reply, snapshot);

      const webinar = snapshot.catalog.byId.get(request.params.id);
      if (!webinar) {
        throw new AppError("WEBINAR_NOT_FOUND", 404, `Webinar ${request.params.id} was not found.`);
      }

      return toWebinarDetail(webinar, now());
    }
  );
}
