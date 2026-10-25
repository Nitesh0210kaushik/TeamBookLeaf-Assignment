import {
  CATEGORY_LABELS,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "../../../constants/ticket";
import type { UserRecord } from "../../auth/models/user.model";
import type { AuthorRecord } from "../../authors/models/author.model";
import type { BookRecord } from "../../books/models/book.model";
import type { TicketEventRecord } from "../models/ticket-event.model";
import type { TicketMessageRecord } from "../models/ticket-message.model";
import type { TicketNoteRecord } from "../models/ticket-note.model";
import type { TicketRecord } from "../models/ticket.model";

/** Related documents loaded in one batch per request (avoids N+1 queries). */
export type TicketRelations = {
  authors: Map<string, AuthorRecord>;
  books: Map<string, BookRecord>;
  users: Map<string, UserRecord>;
};

type Ref = { id: string; name: string } | null;

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null);
const firstName = (name: string) => name.split(" ")[0] ?? name;

function bookRef(ticket: TicketRecord, relations: TicketRelations) {
  if (!ticket.book) return null;
  const book = relations.books.get(String(ticket.book));
  return book ? { id: String(book._id), title: book.title } : null;
}

function userRef(id: unknown, relations: TicketRelations): Ref {
  if (!id) return null;
  const user = relations.users.get(String(id));
  return user ? { id: String(user._id), name: user.name } : null;
}

function categoryLabel(category: string | null | undefined) {
  return category ? CATEGORY_LABELS[category as TicketCategory] : null;
}

// ---------------------------------------------------------------- author-facing

/** What an author may see. No priority, AI internals, assignee, notes or audit events. */
export function toAuthorTicketSummaryDto(ticket: TicketRecord, relations: TicketRelations) {
  return {
    id: String(ticket._id),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status as TicketStatus,
    categoryLabel: categoryLabel(ticket.category),
    book: bookRef(ticket, relations),
    messageCount: ticket.messageCount,
    hasSupportReply: Boolean(ticket.lastAdminReplyAt),
    createdAt: iso(ticket.createdAt)!,
    lastActivityAt: iso(ticket.lastActivityAt),
  };
}

export function toAuthorMessageDto(message: TicketMessageRecord, relations: TicketRelations) {
  const sender = relations.users.get(String(message.sender));
  return {
    id: String(message._id),
    senderRole: message.senderRole,
    // Support replies are signed by the team, with the agent's first name for a human touch.
    senderName:
      message.senderRole === "admin"
        ? `BookLeaf Support${sender ? ` · ${firstName(sender.name)}` : ""}`
        : (sender?.name ?? "You"),
    body: message.body,
    createdAt: iso(message.createdAt)!,
  };
}

export function toAuthorTicketDetailDto(
  ticket: TicketRecord,
  messages: TicketMessageRecord[],
  relations: TicketRelations,
) {
  return {
    ...toAuthorTicketSummaryDto(ticket, relations),
    description: ticket.description,
    attachments: ticket.attachments ?? [],
    messages: messages.map((message) => toAuthorMessageDto(message, relations)),
  };
}

// ----------------------------------------------------------------- admin-facing

export function toAdminTicketSummaryDto(
  ticket: TicketRecord,
  relations: TicketRelations,
  now = new Date(),
) {
  const author = relations.authors.get(String(ticket.author));
  const isOpen = ticket.isOpen;
  const awaitingSupport =
    isOpen && (!ticket.lastAdminReplyAt || ticket.lastAuthorMessageAt > ticket.lastAdminReplyAt);

  return {
    id: String(ticket._id),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status as TicketStatus,
    category: (ticket.category ?? null) as TicketCategory | null,
    categoryLabel: categoryLabel(ticket.category),
    categorySource: ticket.categorySource ?? null,
    priority: ticket.priority as TicketPriority,
    prioritySource: ticket.prioritySource ?? null,
    triageStatus: ticket.triage?.status ?? "pending",
    author: author ? { id: String(author._id), name: author.name, email: author.email } : null,
    book: bookRef(ticket, relations),
    assignee: userRef(ticket.assignee, relations),
    messageCount: ticket.messageCount,
    awaitingSupport,
    // First-response SLA is breached if nobody has replied and the deadline has passed.
    slaDueAt: iso(ticket.slaDueAt)!,
    slaBreached: isOpen && !ticket.firstResponseAt && now > ticket.slaDueAt,
    createdAt: iso(ticket.createdAt)!,
    lastActivityAt: iso(ticket.lastActivityAt),
    firstResponseAt: iso(ticket.firstResponseAt),
    resolvedAt: iso(ticket.resolvedAt),
  };
}

export function toAdminTicketDetailDto(input: {
  ticket: TicketRecord;
  messages: TicketMessageRecord[];
  notes: TicketNoteRecord[];
  events: TicketEventRecord[];
  relations: TicketRelations;
}) {
  const { ticket, relations } = input;
  const triage = ticket.triage;

  return {
    ...toAdminTicketSummaryDto(ticket, relations),
    description: ticket.description,
    attachments: ticket.attachments ?? [],
    triage: {
      status: triage?.status ?? "pending",
      suggestedCategory: triage?.suggestedCategory ?? null,
      suggestedPriority: triage?.suggestedPriority ?? null,
      confidence: triage?.confidence ?? null,
      reasoning: triage?.reasoning ?? null,
      model: triage?.model ?? null,
      fallbackReason: triage?.fallbackReason ?? null,
      completedAt: iso(triage?.completedAt),
    },
    messages: input.messages.map((message) => ({
      id: String(message._id),
      senderRole: message.senderRole,
      sender: userRef(message.sender, relations),
      body: message.body,
      aiAssisted: message.aiAssisted,
      createdAt: iso(message.createdAt)!,
    })),
    notes: input.notes.map((note) => ({
      id: String(note._id),
      createdBy: userRef(note.createdBy, relations),
      body: note.body,
      createdAt: iso(note.createdAt)!,
    })),
    events: input.events.map((event) => ({
      id: String(event._id),
      type: event.type,
      actor: userRef(event.actor, relations),
      from: event.from ?? null,
      to: event.to ?? null,
      meta: event.meta ?? null,
      createdAt: iso(event.createdAt)!,
    })),
  };
}
