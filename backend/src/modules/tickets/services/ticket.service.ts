import type { QueryFilter } from "mongoose";
import { logger } from "../../../config/logger";
import type { AuthUser } from "../../../middlewares/auth";
import { ApiError } from "../../../utils/ApiError";
import { buildPagination } from "../../../utils/ApiResponse";
import { bookRepository } from "../../books/repositories/book.repository";
import { realtimeService } from "../../realtime/services/realtime.service";
import {
  toAdminTicketDetailDto,
  toAdminTicketSummaryDto,
  toAuthorTicketDetailDto,
  toAuthorTicketSummaryDto,
} from "../dtos/ticket.dto";
import { nextSequence } from "../models/counter.model";
import type { TicketRecord } from "../models/ticket.model";
import type { NewTicketEvent } from "../repositories/ticket-event.repository";
import { ticketEventRepository } from "../repositories/ticket-event.repository";
import { ticketMessageRepository } from "../repositories/ticket-message.repository";
import { ticketNoteRepository } from "../repositories/ticket-note.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import type {
  AddMessageInput,
  CreateTicketInput,
  ListTicketsQuery,
} from "../validations/ticket.validation";
import { getAccessibleTicket, priorityFields, statusFields } from "./ticket-access";
import { ticketAiService } from "./ticket-ai.service";
import { loadTicketRelations } from "./ticket-relations";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class TicketService {
  /**
   * Creates the ticket immediately and triages it in the background: the author never waits on
   * the AI, and an AI outage can't block ticket creation.
   */
  async createTicket(user: AuthUser, input: CreateTicketInput) {
    if (input.bookId) {
      const book = await bookRepository.findById(input.bookId);
      if (!book || String(book.author) !== user.authorId) {
        throw ApiError.badRequest("The selected book does not belong to your account.", {
          bookId: ["Choose one of your books or General / Account Level."],
        });
      }
    }

    const now = new Date();
    const ticket = await ticketRepository.create({
      ticketNumber: await nextSequence("ticketNumber"),
      author: user.authorId,
      createdBy: user.id,
      book: input.bookId ?? null,
      subject: input.subject,
      description: input.description,
      attachments: input.attachments.map((file) => ({ ...file, mimeType: file.mimeType ?? null })),
      ...statusFields("open", {}, now),
      ...priorityFields("medium", now),
      triage: { status: "pending" },
      lastActivityAt: now,
      lastAuthorMessageAt: now,
    });

    await ticketEventRepository.createMany([
      { ticketId: ticket._id, actorId: user.id, type: "created" },
    ]);
    realtimeService.publishTicketUpdate(
      { id: String(ticket._id), authorId: user.authorId! },
      "created",
    );

    setImmediate(() => {
      ticketAiService
        .runTriage(String(ticket._id))
        .catch((error) =>
          logger.error({ err: error, ticketId: ticket._id }, "Background triage failed"),
        );
    });

    const relations = await loadTicketRelations([ticket]);
    return toAuthorTicketDetailDto(ticket, [], relations);
  }

  async listTickets(user: AuthUser, query: ListTicketsQuery) {
    const filter: QueryFilter<TicketRecord> = {};

    if (user.role === "author") {
      // Authors are always scoped to their own tickets, whatever filters they send.
      filter.author = user.authorId;
    } else {
      if (query.authorId) filter.author = query.authorId;
      if (query.category) filter.category = { $in: query.category };
      if (query.priority) filter.priority = { $in: query.priority };
      if (query.assignee === "me") filter.assignee = user.id;
      else if (query.assignee === "unassigned") filter.assignee = null;
      else if (query.assignee) filter.assignee = query.assignee;
    }

    if (query.status) filter.status = { $in: query.status };
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: query.from } : {}),
        // A bare date for "to" means "up to the end of that day".
        ...(query.to ? { $lte: new Date(query.to.getTime() + 86_399_999) } : {}),
      };
    }
    if (query.q) {
      const ticketNumber = Number(query.q.replace(/^#/, ""));
      const pattern = new RegExp(escapeRegex(query.q), "i");
      filter.$or = [
        { subject: pattern },
        { description: pattern },
        ...(Number.isInteger(ticketNumber) && ticketNumber > 0 ? [{ ticketNumber }] : []),
      ];
    }

    const { items, total } = await ticketRepository.list({
      filter,
      sort: user.role === "author" ? "recent_activity" : query.sort,
      page: query.page,
      limit: query.limit,
    });
    const relations = await loadTicketRelations(items);

    return {
      tickets: items.map((ticket) =>
        user.role === "author"
          ? toAuthorTicketSummaryDto(ticket, relations)
          : toAdminTicketSummaryDto(ticket, relations),
      ),
      pagination: buildPagination({ page: query.page, limit: query.limit, total }),
    };
  }

  async getTicketDetail(user: AuthUser, ticketId: string) {
    const ticket = await getAccessibleTicket(user, ticketId);
    return this.buildDetail(user, ticket);
  }

  /** Authors reply to their own tickets; admins send responses that the author sees. */
  async addMessage(user: AuthUser, ticketId: string, input: AddMessageInput) {
    const ticket = await getAccessibleTicket(user, ticketId);
    const now = new Date();
    const events: NewTicketEvent[] = [];
    let update: Record<string, unknown>;

    if (user.role === "author") {
      if (ticket.status === "closed") {
        throw ApiError.conflict(
          "This ticket is closed. Please open a new ticket if you need more help.",
        );
      }

      update = { lastAuthorMessageAt: now };
      // A reply on a resolved ticket means it isn't actually resolved — reopen it.
      if (ticket.status === "resolved") {
        Object.assign(update, statusFields("open", ticket, now));
        events.push({
          ticketId: ticket._id,
          actorId: user.id,
          type: "status_changed",
          from: "resolved",
          to: "open",
        });
      }
      events.push({ ticketId: ticket._id, actorId: user.id, type: "author_replied" });
    } else {
      // Sensible default: replying to a new ticket moves it to In Progress.
      const nextStatus = input.status ?? (ticket.status === "open" ? "in_progress" : ticket.status);
      update = {
        lastAdminReplyAt: now,
        firstResponseAt: ticket.firstResponseAt ?? now,
        ...statusFields(nextStatus, ticket, now),
      };
      events.push({
        ticketId: ticket._id,
        actorId: user.id,
        type: "admin_replied",
        meta: { aiAssisted: input.aiAssisted },
      });
      if (nextStatus !== ticket.status) {
        events.push({
          ticketId: ticket._id,
          actorId: user.id,
          type: "status_changed",
          from: ticket.status,
          to: nextStatus,
        });
      }
      // Whoever answers an unassigned ticket owns it.
      if (!ticket.assignee) {
        update.assignee = user.id;
        events.push({ ticketId: ticket._id, actorId: user.id, type: "assigned", to: user.name });
      }
    }

    await ticketMessageRepository.create({
      ticketId: ticket._id,
      senderId: user.id,
      senderRole: user.role,
      body: input.body,
      aiAssisted: user.role === "admin" && input.aiAssisted,
    });
    const updated = await ticketRepository.updateById(ticket._id, {
      $set: { ...update, lastActivityAt: now },
      $inc: { messageCount: 1 },
    });
    await ticketEventRepository.createMany(events);

    realtimeService.publishTicketUpdate(
      { id: String(ticket._id), authorId: String(ticket.author) },
      user.role === "author" ? "author_replied" : "admin_replied",
    );

    return this.buildDetail(user, updated!);
  }

  async buildDetail(user: AuthUser, ticket: TicketRecord) {
    if (user.role === "author") {
      const messages = await ticketMessageRepository.listByTicket(ticket._id);
      const relations = await loadTicketRelations(
        [ticket],
        messages.map((m) => m.sender),
      );
      return toAuthorTicketDetailDto(ticket, messages, relations);
    }

    const [messages, notes, events] = await Promise.all([
      ticketMessageRepository.listByTicket(ticket._id),
      ticketNoteRepository.listByTicket(ticket._id),
      ticketEventRepository.listByTicket(ticket._id),
    ]);
    const relations = await loadTicketRelations(
      [ticket],
      [
        ...messages.map((m) => m.sender),
        ...notes.map((n) => n.createdBy),
        ...events.map((e) => e.actor),
      ],
    );
    return toAdminTicketDetailDto({ ticket, messages, notes, events, relations });
  }
}

export const ticketService = new TicketService();
