import { createApp } from "./app.js";
import { resolveConfig } from "./config.js";

const config = resolveConfig();
const app = await createApp();

try {
  await app.listen({
    host: config.host,
    port: config.port
  });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
