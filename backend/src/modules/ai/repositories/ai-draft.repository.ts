import type { Types } from "mongoose";
import { AiDraftModel, type AiDraftRecord } from "../models/ai-draft.model";
import type { DraftResult } from "../types/ai.types";

export class AiDraftRepository {
  async findLatestForTicket(ticketId: string | Types.ObjectId) {
    return AiDraftModel.findOne({ ticket: ticketId }).sort({ createdAt: -1 }).lean<AiDraftRecord>();
  }

  async create(input: {
    ticketId: string | Types.ObjectId;
    category: string;
    basedOnMessageCount: number;
    requestedBy: string | null;
    draft: DraftResult;
  }) {
    const doc = await AiDraftModel.create({
      ticket: input.ticketId,
      content: input.draft.content,
      source: input.draft.source,
      model: input.draft.model,
      category: input.category,
      knowledgeSections: input.draft.knowledgeSections,
      basedOnMessageCount: input.basedOnMessageCount,
      fallbackReason: input.draft.fallbackReason,
      requestedBy: input.requestedBy,
    });
    return doc.toObject() as AiDraftRecord;
  }
}

export const aiDraftRepository = new AiDraftRepository();
