import { StatusCodes } from "http-status-codes";

export const HTTP_STATUS = StatusCodes;

/** Machine-readable error codes returned in every error response (`error.code`). */
export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  AI_UNAVAILABLE: "AI_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
