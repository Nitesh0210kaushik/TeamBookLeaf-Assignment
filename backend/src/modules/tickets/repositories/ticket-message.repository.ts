import type { Types } from "mongoose";
import type { UserRole } from "../../../constants/roles";
import { TicketMessageModel, type TicketMessageRecord } from "../models/ticket-message.model";

export class TicketMessageRepository {
  async create(data: {
    ticketId: string | Types.ObjectId;
    senderId: string | Types.ObjectId;
    senderRole: UserRole;
    body: string;
    aiAssisted?: boolean;
    createdAt?: Date;
  }) {
    const doc = await TicketMessageModel.create({
      ticket: data.ticketId,
      sender: data.senderId,
      senderRole: data.senderRole,
      body: data.body,
      aiAssisted: data.aiAssisted ?? false,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
    });
    return doc.toObject() as TicketMessageRecord;
  }

  async listByTicket(ticketId: string | Types.ObjectId) {
    return TicketMessageModel.find({ ticket: ticketId })
      .sort({ createdAt: 1 })
      .lean<TicketMessageRecord[]>();
  }

  async countAiAssisted() {
    const [total, aiAssisted] = await Promise.all([
      TicketMessageModel.countDocuments({ senderRole: "admin" }),
      TicketMessageModel.countDocuments({ senderRole: "admin", aiAssisted: true }),
    ]);
    return { total, aiAssisted };
  }
}

export const ticketMessageRepository = new TicketMessageRepository();
