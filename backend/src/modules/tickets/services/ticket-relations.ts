import { Types } from "mongoose";
import { userRepository } from "../../auth/repositories/user.repository";
import { authorRepository } from "../../authors/repositories/author.repository";
import { bookRepository } from "../../books/repositories/book.repository";
import type { TicketRelations } from "../dtos/ticket.dto";
import type { TicketRecord } from "../models/ticket.model";

const uniqueIds = (values: unknown[]) =>
  [...new Set(values.filter(Boolean).map(String))].map((id) => new Types.ObjectId(id));

const toMap = <T extends { _id: Types.ObjectId }>(records: T[]) =>
  new Map(records.map((record) => [String(record._id), record]));

/** Loads every author/book/user referenced by the tickets (and extra user ids) in 3 queries. */
export async function loadTicketRelations(
  tickets: TicketRecord[],
  extraUserIds: unknown[] = [],
): Promise<TicketRelations> {
  const [authors, books, users] = await Promise.all([
    authorRepository.findByIds(uniqueIds(tickets.map((t) => t.author))),
    bookRepository.findByIds(uniqueIds(tickets.map((t) => t.book))),
    userRepository.findByIds(uniqueIds([...tickets.map((t) => t.assignee), ...extraUserIds])),
  ]);

  return { authors: toMap(authors), books: toMap(books), users: toMap(users) };
}
