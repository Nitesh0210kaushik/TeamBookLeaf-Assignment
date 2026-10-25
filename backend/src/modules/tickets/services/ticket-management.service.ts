import { CATEGORY_LABELS } from "../../../constants/ticket";
import type { AuthUser } from "../../../middlewares/auth";
import { ApiError } from "../../../utils/ApiError";
import { userRepository } from "../../auth/repositories/user.repository";
import { realtimeService } from "../../realtime/services/realtime.service";
import type { NewTicketEvent } from "../repositories/ticket-event.repository";
import { ticketEventRepository } from "../repositories/ticket-event.repository";
import { ticketNoteRepository } from "../repositories/ticket-note.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import type { AddNoteInput, UpdateTicketInput } from "../validations/ticket.validation";
import { getAccessibleTicket, priorityFields, statusFields } from "./ticket-access";
import { ticketService } from "./ticket.service";

/** Admin-only ticket operations: status, overrides, assignment and internal notes. */
export class TicketManagementService {
  async updateTicket(admin: AuthUser, ticketId: string, input: UpdateTicketInput) {
    const ticket = await getAccessibleTicket(admin, ticketId);
    const now = new Date();
    const set: Record<string, unknown> = {};
    const events: NewTicketEvent[] = [];
    const base = { ticketId: ticket._id, actorId: admin.id };

    if (input.status && input.status !== ticket.status) {
      Object.assign(set, statusFields(input.status, ticket, now));
      events.push({ ...base, type: "status_changed", from: ticket.status, to: input.status });
    }

    // Overrides are recorded with source "admin" so later AI re-runs leave them alone.
    if (input.category && input.category !== ticket.category) {
      Object.assign(set, { category: input.category, categorySource: "admin" });
      events.push({
        ...base,
        type: "category_changed",
        from: ticket.category ? CATEGORY_LABELS[ticket.category] : null,
        to: CATEGORY_LABELS[input.category],
      });
    }

    if (input.priority && input.priority !== ticket.priority) {
      Object.assign(set, priorityFields(input.priority, ticket.createdAt), {
        prioritySource: "admin",
      });
      events.push({ ...base, type: "priority_changed", from: ticket.priority, to: input.priority });
    }

    if (input.assigneeId !== undefined && String(input.assigneeId) !== String(ticket.assignee)) {
      let assigneeName: string | null = null;
      if (input.assigneeId) {
        const assignee = await userRepository.findById(input.assigneeId);
        if (!assignee || assignee.role !== "admin") {
          throw ApiError.badRequest("Tickets can only be assigned to admin users.", {
            assigneeId: ["Choose an admin user."],
          });
        }
        assigneeName = assignee.name;
      }
      set.assignee = input.assigneeId;
      events.push({ ...base, type: "assigned", to: assigneeName ?? "Unassigned" });
    }

    if (!events.length) {
      return ticketService.buildDetail(admin, ticket);
    }

    const updated = await ticketRepository.updateById(ticket._id, {
      $set: { ...set, lastActivityAt: now },
    });
    await ticketEventRepository.createMany(events);

    // Authors only care about changes they can see (status, category label).
    const visibleToAuthor = Boolean(set.status || set.category);
    realtimeService.publishTicketUpdate(
      { id: String(ticket._id), authorId: String(ticket.author) },
      "updated",
      { adminsOnly: !visibleToAuthor },
    );

    return ticketService.buildDetail(admin, updated!);
  }

  async addNote(admin: AuthUser, ticketId: string, input: AddNoteInput) {
    const ticket = await getAccessibleTicket(admin, ticketId);

    await ticketNoteRepository.create({
      ticketId: ticket._id,
      createdBy: admin.id,
      body: input.body,
    });
    await ticketEventRepository.createMany([
      { ticketId: ticket._id, actorId: admin.id, type: "note_added" },
    ]);
    realtimeService.publishTicketUpdate(
      { id: String(ticket._id), authorId: String(ticket.author) },
      "note_added",
      { adminsOnly: true },
    );

    return ticketService.buildDetail(admin, ticket);
  }
}

export const ticketManagementService = new TicketManagementService();
