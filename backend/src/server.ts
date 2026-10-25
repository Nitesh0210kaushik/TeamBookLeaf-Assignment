import { createServer } from "node:http";
import { createApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";

async function bootstrap() {
  await connectDatabase();

  const server = createServer(createApp());
  server.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT}${env.API_PREFIX}`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    // Open SSE connections would otherwise keep the server alive forever.
    server.closeAllConnections();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((error) => {
  logger.fatal({ err: error }, "Failed to start backend server");
  process.exit(1);
});
