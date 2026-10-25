import type { Types } from "mongoose";
import type { TicketEventType } from "../../../constants/ticket";
import { TicketEventModel, type TicketEventRecord } from "../models/ticket-event.model";

export type NewTicketEvent = {
  ticketId: string | Types.ObjectId;
  actorId: string | Types.ObjectId | null;
  type: TicketEventType;
  from?: string | null;
  to?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt?: Date;
};

export class TicketEventRepository {
  async createMany(events: NewTicketEvent[]) {
    if (!events.length) return;

    await TicketEventModel.insertMany(
      events.map((event) => ({
        ticket: event.ticketId,
        actor: event.actorId,
        type: event.type,
        from: event.from ?? null,
        to: event.to ?? null,
        meta: event.meta ?? null,
        ...(event.createdAt ? { createdAt: event.createdAt } : {}),
      })),
    );
  }

  async listByTicket(ticketId: string | Types.ObjectId) {
    return TicketEventModel.find({ ticket: ticketId })
      .sort({ createdAt: 1 })
      .lean<TicketEventRecord[]>();
  }
}

export const ticketEventRepository = new TicketEventRepository();
