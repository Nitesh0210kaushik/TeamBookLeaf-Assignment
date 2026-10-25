import { Types } from "mongoose";
import type { UserRole } from "../../../constants/roles";
import type { StoredAttachment } from "../../attachments/services/attachment.service";
import { TicketMessageModel, type TicketMessageRecord } from "../models/ticket-message.model";

export class TicketMessageRepository {
  async create(data: {
    ticketId: string | Types.ObjectId;
    senderId: string | Types.ObjectId;
    senderRole: UserRole;
    body: string;
    attachments: StoredAttachment[];
    aiAssisted?: boolean;
  }) {
    const doc = await TicketMessageModel.create({
      ticket: data.ticketId,
      sender: data.senderId,
      senderRole: data.senderRole,
      body: data.body,
      attachments: data.attachments,
      aiAssisted: data.aiAssisted ?? false,
    });
    return doc.toObject() as TicketMessageRecord;
  }

  async listByTicket(ticketId: string | Types.ObjectId) {
    return TicketMessageModel.find({ ticket: ticketId })
      .sort({ createdAt: 1 })
      .lean<TicketMessageRecord[]>();
  }

  async hasAttachment(ticketId: Types.ObjectId, fileId: string) {
    const match = await TicketMessageModel.exists({
      ticket: ticketId,
      "attachments.fileId": new Types.ObjectId(fileId),
    });
    return match !== null;
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
