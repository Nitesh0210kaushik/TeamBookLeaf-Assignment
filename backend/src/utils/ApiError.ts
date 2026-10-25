import { ERROR_CODES, HTTP_STATUS, type ErrorCode } from "../constants/http";

export type ErrorDetails = Record<string, string[]>;

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ErrorDetails;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: ErrorDetails) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: ErrorDetails) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, message, details);
  }

  static unauthenticated(message = "Authentication is required.") {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHENTICATED, message);
  }

  static forbidden(message = "You do not have permission to access this resource.") {
    return new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = "Resource not found.") {
    return new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message: string) {
    return new ApiError(HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, message);
  }
}
