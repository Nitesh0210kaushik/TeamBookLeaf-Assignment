import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const id = typeof existing === "string" && existing ? existing : randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  // Long-lived SSE connections and health checks would only add noise.
  autoLogging: {
    ignore: (req) => Boolean(req.url?.includes("/realtime/stream") || req.url?.endsWith("/health")),
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
