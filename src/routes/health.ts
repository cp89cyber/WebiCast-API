import type { FastifyInstance } from "fastify";

import { HealthResponseSchema } from "../types/webinar.js";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/healthz",
    {
      schema: {
        tags: ["Health"],
        response: {
          200: HealthResponseSchema
        }
      }
    },
    async () => ({ status: "ok" as const })
  );
}
