import type { ErrorCode } from "../constants/http";
import type { ErrorDetails } from "./ApiError";

export type ApiSuccessPayload<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiErrorPayload = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
  };
};

export type PaginationDto = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function apiResponse<T>(message: string, data: T): ApiSuccessPayload<T> {
  return { success: true, message, data };
}

export function apiErrorResponse(
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): ApiErrorPayload {
  return { success: false, error: { code, message, ...(details ? { details } : {}) } };
}

export function buildPagination(input: {
  page: number;
  limit: number;
  total: number;
}): PaginationDto {
  return {
    page: input.page,
    limit: input.limit,
    total: input.total,
    totalPages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}
