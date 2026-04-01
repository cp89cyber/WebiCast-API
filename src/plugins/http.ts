import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export interface HttpPluginOptions {
  rateLimitMax: number;
}

export async function registerHttpPlugins(app: FastifyInstance, options: HttpPluginOptions): Promise<void> {
  await app.register(cors, {
    methods: ["GET", "HEAD"],
    origin: true
  });

  await app.register(rateLimit, {
    global: true,
    max: options.rateLimitMax,
    timeWindow: "1 minute"
  });
}
