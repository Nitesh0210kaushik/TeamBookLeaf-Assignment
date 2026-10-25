import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { ERROR_CODES } from "../constants/http";
import { apiErrorResponse } from "../utils/ApiResponse";

function limiter(options: {
  windowMs: number;
  limit: number;
  message: string;
  keyByUser?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Per-user limits for authenticated, expensive endpoints; per-IP otherwise.
    keyGenerator: options.keyByUser
      ? (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? "")
      : undefined,
    handler: (_req, res, _next, opts) => {
      res.status(opts.statusCode).json(apiErrorResponse(ERROR_CODES.RATE_LIMITED, options.message));
    },
  });
}

export const apiRateLimiter = limiter({
  windowMs: 60_000,
  limit: 300,
  message: "Too many requests. Please slow down.",
});

export const loginRateLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 20,
  message: "Too many login attempts. Please try again in a few minutes.",
});

/** Caps AI spend per admin: draft regeneration / re-triage are the only user-triggered LLM calls. */
export const aiRateLimiter = limiter({
  windowMs: 60_000,
  limit: 15,
  message: "AI request limit reached. Please wait a minute before regenerating.",
  keyByUser: true,
});
