import type { BookRecord } from "../models/book.model";
import { getProductionInfo, type ProductionInfo } from "../utils/production";
import { toIsoDate } from "../utils/royalty";

export type BookDto = {
  id: string;
  bookCode: string;
  authorId: string;
  title: string;
  isbn: string | null;
  genre: string | null;
  publicationDate: string | null;
  status: string;
  production: ProductionInfo;
  mrp: number | null;
  authorRoyaltyPerCopy: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
};

export function toBookDto(book: BookRecord): BookDto {
  return {
    id: String(book._id),
    bookCode: book.bookCode,
    authorId: String(book.author),
    title: book.title,
    isbn: book.isbn ?? null,
    genre: book.genre ?? null,
    publicationDate: book.publicationDate ? toIsoDate(book.publicationDate) : null,
    status: book.status,
    production: getProductionInfo(book.status),
    mrp: book.mrp ?? null,
    authorRoyaltyPerCopy: book.authorRoyaltyPerCopy ?? null,
    totalCopiesSold: book.totalCopiesSold ?? 0,
    totalRoyaltyEarned: book.totalRoyaltyEarned ?? 0,
    royaltyPaid: book.royaltyPaid ?? 0,
    royaltyPending: book.royaltyPending ?? 0,
    lastRoyaltyPayoutDate: book.lastRoyaltyPayoutDate
      ? toIsoDate(book.lastRoyaltyPayoutDate)
      : null,
    printPartner: book.printPartner ?? null,
    availableOn: book.availableOn ?? [],
  };
}
