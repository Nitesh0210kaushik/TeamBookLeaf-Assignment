import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || "/api/v1";

/**
 * Single RTK Query API. Feature endpoints are injected from their own files.
 * The session lives in an httpOnly cookie, so requests just include credentials —
 * no token is ever stored in JavaScript.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE_URL, credentials: "include" }),
  tagTypes: [
    "Me",
    "Account",
    "Books",
    "AuthorAccount",
    "TicketList",
    "Ticket",
    "Draft",
    "Stats",
    "Team",
  ],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
