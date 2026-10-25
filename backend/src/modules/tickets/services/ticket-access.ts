import {
  PRIORITY_RANK,
  PRIORITY_SLA_HOURS,
  UNRESOLVED_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from "../../../constants/ticket";
import type { AuthUser } from "../../../middlewares/auth";
import { ApiError } from "../../../utils/ApiError";
import { ticketRepository } from "../repositories/ticket.repository";

/**
 * Loads a ticket the user is allowed to see. Authors get 404 (not 403) for tickets that aren't
 * theirs, so ticket ids can't be probed. This is the single RBAC gate for ticket reads/writes.
 */
export async function getAccessibleTicket(user: AuthUser, ticketId: string) {
  const ticket = await ticketRepository.findById(ticketId);

  if (!ticket || (user.role === "author" && String(ticket.author) !== user.authorId)) {
    throw ApiError.notFound("Ticket not found.");
  }

  return ticket;
}

/** Fields that must change together whenever the status changes. */
export function statusFields(
  status: TicketStatus,
  current: { resolvedAt?: Date | null },
  now: Date,
) {
  const isOpen = UNRESOLVED_STATUSES.includes(status);
  return {
    status,
    isOpen,
    resolvedAt: isOpen ? null : (current.resolvedAt ?? now),
  };
}

/** Fields that must change together whenever the priority changes. SLA is measured from creation. */
export function priorityFields(priority: TicketPriority, createdAt: Date) {
  return {
    priority,
    priorityRank: PRIORITY_RANK[priority],
    slaDueAt: new Date(createdAt.getTime() + PRIORITY_SLA_HOURS[priority] * 3_600_000),
  };
}
