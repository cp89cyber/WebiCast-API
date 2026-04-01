import Fastify, { type FastifyError, type FastifyInstance } from "fastify";

import type { AppConfigOverrides } from "./config.js";
import { resolveConfig } from "./config.js";
import { CatalogCache } from "./lib/cache.js";
import { AppError } from "./lib/errors.js";
import type { SourceClient } from "./lib/source-client.js";
import { WebinarTvSourceClient } from "./lib/source-client.js";
import { registerDocsPlugins } from "./plugins/docs.js";
import { registerHttpPlugins } from "./plugins/http.js";
import { registerCatalogRoutes } from "./routes/catalog.js";
import { registerHealthRoutes } from "./routes/health.js";

export interface CreateAppOptions {
  config?: AppConfigOverrides;
  sourceClient?: SourceClient;
  now?: () => number;
}

export async function createApp(options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const config = resolveConfig(options.config);
  const app = Fastify({
    logger: {
      level: config.logLevel
    }
  });

  const sourceClient = options.sourceClient ?? new WebinarTvSourceClient({ sourceUrl: config.sourceUrl });
  const cache = new CatalogCache({
    sourceClient,
    sourceUrl: config.sourceUrl,
    cacheTtlMs: config.cacheTtlMs,
    staleIfErrorMs: config.staleIfErrorMs,
    ...(options.now ? { now: options.now } : {})
  });

  await registerDocsPlugins(app);
  await registerHttpPlugins(app, { rateLimitMax: config.rateLimitMax });
  await registerHealthRoutes(app);
  await registerCatalogRoutes(app, {
    cache,
    ...(options.now ? { now: options.now } : {})
  });

  app.get("/openapi.json", async () => app.swagger());

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({
      code: "NOT_FOUND",
      message: "Route not found."
    });
  });

  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof AppError) {
      reply.code(error.statusCode).send({
        code: error.code,
        message: error.message,
        details: error.details
      });
      return;
    }

    if ("validation" in error && error.validation) {
      reply.code(400).send({
        code: "VALIDATION_ERROR",
        message: error.message
      });
      return;
    }

    app.log.error(error);
    reply.code(500).send({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error."
    });
  });

  return app;
}
