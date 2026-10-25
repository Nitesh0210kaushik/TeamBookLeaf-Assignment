import { toIsoDate, type RoyaltySummary } from "../../books/utils/royalty";
import type { AuthorRecord } from "../models/author.model";

export type AuthorDto = {
  id: string;
  authorCode: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  joinedDate: string | null;
};

export type AuthorAccountDto = {
  author: AuthorDto;
  bookCounts: { total: number; published: number; inProduction: number };
  royaltySummary: RoyaltySummary;
};

export function toAuthorDto(author: AuthorRecord): AuthorDto {
  return {
    id: String(author._id),
    authorCode: author.authorCode,
    name: author.name,
    email: author.email,
    phone: author.phone ?? null,
    city: author.city ?? null,
    joinedDate: author.joinedDate ? toIsoDate(author.joinedDate) : null,
  };
}
