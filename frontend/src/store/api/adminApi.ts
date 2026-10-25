import type { AdminStats, ApiSuccess, TeamMember } from "@/types/api";
import { baseApi } from "./baseApi";

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStats: build.query<AdminStats, void>({
      query: () => "/admin/stats",
      transformResponse: (r: ApiSuccess<AdminStats>) => r.data,
      providesTags: ["Stats"],
    }),
    getTeam: build.query<TeamMember[], void>({
      query: () => "/admin/team",
      transformResponse: (r: ApiSuccess<{ team: TeamMember[] }>) => r.data.team,
      providesTags: ["Team"],
    }),
  }),
});

export const { useGetStatsQuery, useGetTeamQuery } = adminApi;
