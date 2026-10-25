import type { ApiSuccess, User } from "@/types/api";
import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    me: build.query<User, void>({
      query: () => "/auth/me",
      transformResponse: (response: ApiSuccess<{ user: User }>) => response.data.user,
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
