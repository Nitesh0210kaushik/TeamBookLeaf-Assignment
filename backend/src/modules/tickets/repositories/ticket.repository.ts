import type { QueryFilter, SortOrder, Types, UpdateQuery } from "mongoose";
import { TicketModel, type TicketRecord } from "../models/ticket.model";

export type TicketSort = "urgency" | "newest" | "oldest" | "recent_activity";

const SORTS: Record<TicketSort, Record<string, SortOrder>> = {
  // Unresolved first, then most urgent, then the oldest — what the ops team should work on next.
  urgency: { isOpen: -1, priorityRank: -1, createdAt: 1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  recent_activity: { lastActivityAt: -1 },
};

export class TicketRepository {
  async create(data: Record<string, unknown>) {
    const doc = await TicketModel.create(data);
    return doc.toObject() as TicketRecord;
  }

  async findById(ticketId: string | Types.ObjectId) {
    return TicketModel.findById(ticketId).lean<TicketRecord>();
  }

  async list(options: {
    filter: QueryFilter<TicketRecord>;
    sort: TicketSort;
    page: number;
    limit: number;
  }) {
    const [items, total] = await Promise.all([
      TicketModel.find(options.filter)
        .sort(SORTS[options.sort])
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .lean<TicketRecord[]>(),
      TicketModel.countDocuments(options.filter),
    ]);
    return { items, total };
  }

  async updateById(ticketId: string | Types.ObjectId, update: UpdateQuery<TicketRecord>) {
    return TicketModel.findByIdAndUpdate(ticketId, update, {
      returnDocument: "after",
      runValidators: true,
    }).lean<TicketRecord>();
  }

  async countBy(filter: QueryFilter<TicketRecord>) {
    return TicketModel.countDocuments(filter);
  }

  async groupCount(
    field: "status" | "priority" | "category",
    filter: QueryFilter<TicketRecord> = {},
  ) {
    const rows = await TicketModel.aggregate<{ _id: string | null; count: number }>([
      { $match: filter },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [row._id ?? "unclassified", row.count]));
  }

  /** How often admins kept vs. overrode the AI's suggestion (classification accuracy proxy). */
  async aiOverrideStats() {
    const [row] = await TicketModel.aggregate<{
      triaged: number;
      categoryOverridden: number;
      priorityOverridden: number;
    }>([
      { $match: { "triage.status": "completed" } },
      {
        $group: {
          _id: null,
          triaged: { $sum: 1 },
          categoryOverridden: {
            $sum: { $cond: [{ $ne: ["$category", "$triage.suggestedCategory"] }, 1, 0] },
          },
          priorityOverridden: {
            $sum: { $cond: [{ $ne: ["$priority", "$triage.suggestedPriority"] }, 1, 0] },
          },
        },
      },
    ]);
    return row ?? { triaged: 0, categoryOverridden: 0, priorityOverridden: 0 };
  }
}

export const ticketRepository = new TicketRepository();
