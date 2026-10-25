import type { TicketCategory } from "../../../constants/ticket";
import { ApiError } from "../../../utils/ApiError";
import type { BookFacts, DraftInput, RoyaltyFacts, TriageInput } from "../../ai/types/ai.types";
import { authorRepository } from "../../authors/repositories/author.repository";
import type { BookRecord } from "../../books/models/book.model";
import { bookRepository } from "../../books/repositories/book.repository";
import { getProductionInfo } from "../../books/utils/production";
import { summarizeRoyalties, toIsoDate } from "../../books/utils/royalty";
import type { TicketRecord } from "../models/ticket.model";
import { ticketMessageRepository } from "../repositories/ticket-message.repository";

function toBookFacts(book: BookRecord): BookFacts {
  return {
    bookCode: book.bookCode,
    title: book.title,
    isbn: book.isbn ?? null,
    status: book.status,
    isPublished: getProductionInfo(book.status).isPublished,
    publicationDate: book.publicationDate ? toIsoDate(book.publicationDate) : null,
    mrp: book.mrp ?? null,
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

function toRoyaltyFacts(books: BookRecord[]): RoyaltyFacts {
  const summary = summarizeRoyalties(books);
  return {
    totalRoyaltyPending: summary.totalRoyaltyPending,
    meetsPayoutThreshold: summary.meetsPayoutThreshold,
    payoutThresholdInr: summary.payoutThresholdInr,
    lastPayoutDate: summary.lastPayoutDate,
    payoutNeedsReview: summary.payoutNeedsReview,
    nextPayoutQuarter: summary.schedule.nextPayoutQuarter,
    nextPayoutBy: summary.schedule.nextPayoutBy,
  };
}

/**
 * Turns database records into the compact, pre-computed facts the AI layer needs.
 * Keeping this outside the AI module means prompts never touch the database directly.
 */
export class TicketContextService {
  async buildTriageInput(
    ticket: Pick<TicketRecord, "author" | "book" | "subject" | "description">,
  ): Promise<TriageInput> {
    const books = await bookRepository.findByAuthor(ticket.author);
    const book = ticket.book ? books.find((b) => String(b._id) === String(ticket.book)) : undefined;

    return {
      subject: ticket.subject,
      description: ticket.description,
      book: book ? toBookFacts(book) : null,
      royalty: toRoyaltyFacts(books),
    };
  }

  async buildDraftInput(ticket: TicketRecord, category: TicketCategory): Promise<DraftInput> {
    const [author, books, messages] = await Promise.all([
      authorRepository.findById(ticket.author),
      bookRepository.findByAuthor(ticket.author),
      ticketMessageRepository.listByTicket(ticket._id),
    ]);

    if (!author) {
      throw ApiError.notFound("Ticket author not found.");
    }

    const book = ticket.book ? books.find((b) => String(b._id) === String(ticket.book)) : undefined;

    return {
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      category,
      status: ticket.status,
      author: {
        name: author.name,
        firstName: author.name.split(" ")[0] ?? author.name,
        joinedDate: author.joinedDate ? toIsoDate(author.joinedDate) : null,
      },
      book: book ? toBookFacts(book) : null,
      otherBooks: books.map((b) => ({ title: b.title, status: b.status })),
      royalty: toRoyaltyFacts(books),
      // The original description is the first author message; internal notes are never included.
      conversation: [
        {
          role: "author" as const,
          body: ticket.description,
          createdAt: ticket.createdAt.toISOString(),
        },
        ...messages.map((message) => ({
          role: message.senderRole,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
        })),
      ],
      today: toIsoDate(new Date()),
    };
  }
}

export const ticketContextService = new TicketContextService();
