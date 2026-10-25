import type { ApiSuccess, User } from "@/types/api";
import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Uses the session check (200 with user: null when logged out) instead of /auth/me,
    // so visiting the login page doesn't produce 401s in the console.
    me: build.query<User | null, void>({
      query: () => "/auth/session",
      transformResponse: (response: ApiSuccess<{ user: User | null }>) => response.data.user,
      providesTags: ["Me"],
    }),
    login: build.mutation<User, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: (response: ApiSuccess<{ user: User }>) => response.data.user,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data: user } = await queryFulfilled;
        // Drop anything cached for a previous user, then seed the session.
        dispatch(baseApi.util.resetApiState());
        dispatch(authApi.util.upsertQueryData("me", undefined, user));
      },
    }),
    logout: build.mutation<null, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled.catch(() => undefined);
        dispatch(baseApi.util.resetApiState());
      },
    }),
  }),
});

export const { useMeQuery, useLoginMutation, useLogoutMutation } = authApi;
