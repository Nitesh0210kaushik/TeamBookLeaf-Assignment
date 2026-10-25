import type { Types } from "mongoose";
import { TicketNoteModel, type TicketNoteRecord } from "../models/ticket-note.model";

export class TicketNoteRepository {
  async create(data: {
    ticketId: string | Types.ObjectId;
    createdBy: string | Types.ObjectId;
    body: string;
  }) {
    const doc = await TicketNoteModel.create({
      ticket: data.ticketId,
      createdBy: data.createdBy,
      body: data.body,
    });
    return doc.toObject() as TicketNoteRecord;
  }

  async listByTicket(ticketId: string | Types.ObjectId) {
    return TicketNoteModel.find({ ticket: ticketId })
      .sort({ createdAt: 1 })
      .lean<TicketNoteRecord[]>();
  }
}

export const ticketNoteRepository = new TicketNoteRepository();
