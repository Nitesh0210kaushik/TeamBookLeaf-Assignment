import type {
  AdminTicketDetail,
  AdminTicketSummary,
  AiDraft,
  AiStatus,
  ApiSuccess,
  Attachment,
  AuthorTicketDetail,
  AuthorTicketSummary,
  Pagination,
  TicketCategory,
  TicketListQuery,
  TicketPriority,
  TicketStatus,
} from "@/types/api";
import { baseApi } from "./baseApi";

type TicketList<T> = { tickets: T[]; pagination: Pagination };
type DraftResponse = { draft: AiDraft; ai: AiStatus };

const ticketTags = (id: string) => [
  { type: "Ticket" as const, id },
  "TicketList" as const,
  "Stats" as const,
];

export const ticketsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ------------------------------------------------------------- author
    listMyTickets: build.query<TicketList<AuthorTicketSummary>, void>({
      query: () => ({ url: "/tickets", params: { limit: 100 } }),
      transformResponse: (r: ApiSuccess<TicketList<AuthorTicketSummary>>) => r.data,
      providesTags: ["TicketList"],
    }),
    getMyTicket: build.query<AuthorTicketDetail, string>({
      query: (id) => `/tickets/${id}`,
      transformResponse: (r: ApiSuccess<{ ticket: AuthorTicketDetail }>) => r.data.ticket,
      providesTags: (_r, _e, id) => [{ type: "Ticket", id }],
    }),
    createTicket: build.mutation<
      AuthorTicketDetail,
      { bookId: string | null; subject: string; description: string; attachments: Attachment[] }
    >({
      query: (body) => ({ url: "/tickets", method: "POST", body }),
      transformResponse: (r: ApiSuccess<{ ticket: AuthorTicketDetail }>) => r.data.ticket,
      invalidatesTags: ["TicketList"],
    }),
    replyAsAuthor: build.mutation<AuthorTicketDetail, { id: string; body: string }>({
      query: ({ id, body }) => ({ url: `/tickets/${id}/messages`, method: "POST", body: { body } }),
      transformResponse: (r: ApiSuccess<{ ticket: AuthorTicketDetail }>) => r.data.ticket,
      invalidatesTags: (_r, _e, { id }) => ticketTags(id),
    }),

    // -------------------------------------------------------------- admin
    listQueue: build.query<TicketList<AdminTicketSummary>, TicketListQuery>({
      query: (params) => ({ url: "/tickets", params }),
      transformResponse: (r: ApiSuccess<TicketList<AdminTicketSummary>>) => r.data,
      providesTags: ["TicketList"],
    }),
    getAdminTicket: build.query<AdminTicketDetail, string>({
      query: (id) => `/tickets/${id}`,
      transformResponse: (r: ApiSuccess<{ ticket: AdminTicketDetail }>) => r.data.ticket,
      providesTags: (_r, _e, id) => [{ type: "Ticket", id }],
    }),
    updateTicket: build.mutation<
      AdminTicketDetail,
      {
        id: string;
        status?: TicketStatus;
        category?: TicketCategory;
        priority?: TicketPriority;
        assigneeId?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({ url: `/tickets/${id}`, method: "PATCH", body }),
      transformResponse: (r: ApiSuccess<{ ticket: AdminTicketDetail }>) => r.data.ticket,
      invalidatesTags: (_r, _e, { id }) => [...ticketTags(id), { type: "Draft", id }],
    }),
    replyAsAdmin: build.mutation<
      AdminTicketDetail,
      { id: string; body: string; status?: TicketStatus; aiAssisted: boolean }
    >({
      query: ({ id, ...body }) => ({ url: `/tickets/${id}/messages`, method: "POST", body }),
      transformResponse: (r: ApiSuccess<{ ticket: AdminTicketDetail }>) => r.data.ticket,
      invalidatesTags: (_r, _e, { id }) => ticketTags(id),
    }),
    addNote: build.mutation<AdminTicketDetail, { id: string; body: string }>({
      query: ({ id, body }) => ({ url: `/tickets/${id}/notes`, method: "POST", body: { body } }),
      transformResponse: (r: ApiSuccess<{ ticket: AdminTicketDetail }>) => r.data.ticket,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Ticket", id }],
    }),
    getDraft: build.query<DraftResponse, string>({
      query: (id) => `/tickets/${id}/ai-draft`,
      transformResponse: (r: ApiSuccess<DraftResponse>) => r.data,
      providesTags: (_r, _e, id) => [{ type: "Draft", id }],
      // Drafts only change when the conversation does; don't refetch on every window focus.
      keepUnusedDataFor: 300,
    }),
    regenerateDraft: build.mutation<DraftResponse, string>({
      query: (id) => ({ url: `/tickets/${id}/ai-draft`, method: "POST" }),
      transformResponse: (r: ApiSuccess<DraftResponse>) => r.data,
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(ticketsApi.util.upsertQueryData("getDraft", id, data));
      },
    }),
    rerunTriage: build.mutation<AdminTicketDetail, string>({
      query: (id) => ({ url: `/tickets/${id}/ai-triage`, method: "POST" }),
      transformResponse: (r: ApiSuccess<{ ticket: AdminTicketDetail }>) => r.data.ticket,
      invalidatesTags: (_r, _e, id) => [...ticketTags(id), { type: "Draft", id }],
    }),
  }),
});

export const {
  useListMyTicketsQuery,
  useGetMyTicketQuery,
  useCreateTicketMutation,
  useReplyAsAuthorMutation,
  useListQueueQuery,
  useGetAdminTicketQuery,
  useUpdateTicketMutation,
  useReplyAsAdminMutation,
  useAddNoteMutation,
  useGetDraftQuery,
  useRegenerateDraftMutation,
  useRerunTriageMutation,
} = ticketsApi;
