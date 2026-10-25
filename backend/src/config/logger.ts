import pino from "pino";
import { env } from "./env";

/**
 * Structured JSON logs in production (cheap to ship to any log platform);
 * human-readable output in development via pino-pretty (a dev dependency).
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "bookleaf-support-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.passwordHash",
      "*.apiKey",
    ],
    censor: "[redacted]",
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:HH:MM:ss",
            ignore: "pid,hostname,service",
          },
        }
      : undefined,
});
