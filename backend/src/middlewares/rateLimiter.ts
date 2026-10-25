import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { ERROR_CODES } from "../constants/http";
import { apiErrorResponse } from "../utils/ApiResponse";

function limiter(options: {
  windowMs: number;
  limit: number;
  message: string;
  keyByUser?: boolean;
  skipSuccessfulRequests?: boolean;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
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

/**
 * Brute-force protection: only failed logins count, so people switching between accounts
 * (or a team behind one office IP) are never locked out by successful sign-ins.
 */
export const loginRateLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 10,
  message: "Too many failed login attempts. Please try again in a few minutes.",
  skipSuccessfulRequests: true,
});

/** Caps AI spend per admin: draft regeneration / re-triage are the only user-triggered LLM calls. */
export const aiRateLimiter = limiter({
  windowMs: 60_000,
  limit: 15,
  message: "AI request limit reached. Please wait a minute before regenerating.",
  keyByUser: true,
});
