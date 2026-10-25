import type { Types } from "mongoose";
import { AiUsageLogModel } from "../models/ai-usage-log.model";
import type { AiFailureReason, AiOperation, AiUsage } from "../types/ai.types";

export class AiUsageRepository {
  async log(entry: {
    operation: AiOperation;
    ticketId: string | Types.ObjectId | null;
    model: string;
    success: boolean;
    failureReason?: AiFailureReason | null;
    usage?: AiUsage | null;
    latencyMs: number;
  }) {
    return AiUsageLogModel.create({
      operation: entry.operation,
      ticket: entry.ticketId,
      model: entry.model,
      success: entry.success,
      failureReason: entry.failureReason ?? null,
      inputTokens: entry.usage?.inputTokens ?? 0,
      outputTokens: entry.usage?.outputTokens ?? 0,
      cacheReadTokens: entry.usage?.cacheReadTokens ?? 0,
      cacheWriteTokens: entry.usage?.cacheWriteTokens ?? 0,
      latencyMs: entry.latencyMs,
    });
  }

  /** Totals per operation + model since a given date (admin dashboard). */
  async summarizeSince(since: Date) {
    return AiUsageLogModel.aggregate<{
      _id: { operation: AiOperation; model: string };
      calls: number;
      failures: number;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      avgLatencyMs: number;
    }>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { operation: "$operation", model: "$model" },
          calls: { $sum: 1 },
          failures: { $sum: { $cond: ["$success", 0, 1] } },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
          cacheReadTokens: { $sum: "$cacheReadTokens" },
          avgLatencyMs: { $avg: "$latencyMs" },
        },
      },
    ]);
  }
}

export const aiUsageRepository = new AiUsageRepository();
