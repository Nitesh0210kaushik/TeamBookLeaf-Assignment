import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { ApiErrorBody } from "@/types/api";

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "error" in value;
}

/** Turns any RTK Query error into a message a user can act on. */
export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  const fetchError = error as FetchBaseQueryError | undefined;
  if (fetchError && "status" in fetchError) {
    if (isApiErrorBody(fetchError.data)) return fetchError.data.error.message;
    if (fetchError.status === "FETCH_ERROR") return "Can't reach the server. Check your connection.";
  }
  return fallback;
}

export function getFieldErrors(error: unknown): Record<string, string[]> {
  const fetchError = error as FetchBaseQueryError | undefined;
  if (fetchError && "data" in fetchError && isApiErrorBody(fetchError.data)) {
    return fetchError.data.error.details ?? {};
  }
  return {};
}
