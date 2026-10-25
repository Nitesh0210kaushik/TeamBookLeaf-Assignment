import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { allowedOrigins, env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { requestLogger } from "./middlewares/requestLogger";
import { apiRoutes } from "./routes";
import { apiResponse } from "./utils/ApiResponse";

/**
 * In production the backend can also serve the built frontend, so the whole app runs as a
 * single same-origin service (simpler cookies, no CORS, SSE works without proxies).
 */
function registerFrontendAssets(app: express.Express) {
  if (env.NODE_ENV !== "production") {
    return;
  }

  const frontendDistDir = process.env.FRONTEND_DIST_DIR
    ? path.resolve(process.env.FRONTEND_DIST_DIR)
    : path.resolve(__dirname, "../../frontend/dist");
  const indexFile = path.join(frontendDistDir, "index.html");

  if (!fs.existsSync(indexFile)) {
    logger.warn({ frontendDistDir }, "Frontend build not found; serving API only.");
    return;
  }

  app.use(express.static(frontendDistDir, { index: false, maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith(env.API_PREFIX)) {
      next();
      return;
    }
    res.sendFile(indexFile);
  });
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || allowedOrigins.includes(origin));
      },
      credentials: true,
    }),
  );
  app.use(requestLogger);
  app.use(
    compression({
      // Compression buffers output, which would break Server-Sent Events.
      filter: (req, res) =>
        req.headers.accept !== "text/event-stream" && compression.filter(req, res),
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));

  app.get(env.API_PREFIX, (_req, res) => {
    res.json(
      apiResponse("BookLeaf Author Support API is running.", {
        apiBase: env.API_PREFIX,
        docs: `${env.API_PREFIX}/docs`,
      }),
    );
  });
  app.use(env.API_PREFIX, apiRoutes);
  registerFrontendAssets(app);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
