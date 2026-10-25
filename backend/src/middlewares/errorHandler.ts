import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { logger } from "../config/logger";
import { ERROR_CODES, HTTP_STATUS } from "../constants/http";
import { ApiError } from "../utils/ApiError";
import { apiErrorResponse } from "../utils/ApiResponse";

/** Maps known library errors to meaningful client errors instead of generic 500s. */
function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest(`Invalid value for "${error.path}".`);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [path, issue] of Object.entries(error.errors)) {
      details[path] = [issue.message];
    }
    return ApiError.badRequest("Validation failed.", details);
  }

  // Malformed JSON body from express.json()
  if (error instanceof SyntaxError && "body" in error) {
    return ApiError.badRequest("Request body is not valid JSON.");
  }

  if (typeof error === "object" && error && "type" in error && error.type === "entity.too.large") {
    return new ApiError(
      HTTP_STATUS.REQUEST_TOO_LONG,
      ERROR_CODES.VALIDATION_ERROR,
      "Request body is too large.",
    );
  }

  if (typeof error === "object" && error && "code" in error && error.code === 11000) {
    return ApiError.conflict("A record with the same unique value already exists.");
  }

  return new ApiError(
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_ERROR,
    "Something went wrong on our side. Please try again.",
  );
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const apiError = normalizeError(error);

  if (apiError.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error({ err: error, method: req.method, url: req.originalUrl }, "Unhandled API error");
  }

  res
    .status(apiError.statusCode)
    .json(apiErrorResponse(apiError.code, apiError.message, apiError.details));
};
