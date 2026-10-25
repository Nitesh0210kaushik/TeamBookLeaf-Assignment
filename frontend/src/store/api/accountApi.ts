import type { ApiSuccess, AuthorAccount, Book } from "@/types/api";
import { baseApi } from "./baseApi";

export const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyAccount: build.query<AuthorAccount, void>({
      query: () => "/authors/me",
      transformResponse: (response: ApiSuccess<AuthorAccount>) => response.data,
      providesTags: ["Account"],
    }),
    getBooks: build.query<Book[], { authorId?: string } | void>({
      query: (params) => ({ url: "/books", params: params ?? undefined }),
      transformResponse: (response: ApiSuccess<{ books: Book[] }>) => response.data.books,
      providesTags: ["Books"],
    }),
    getAuthorAccount: build.query<AuthorAccount, string>({
      query: (authorId) => `/authors/${authorId}`,
      transformResponse: (response: ApiSuccess<AuthorAccount>) => response.data,
      providesTags: (_result, _error, authorId) => [{ type: "AuthorAccount", id: authorId }],
    }),
  }),
});

export const { useGetMyAccountQuery, useGetBooksQuery, useGetAuthorAccountQuery } = accountApi;
