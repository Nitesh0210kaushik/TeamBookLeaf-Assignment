import { UNRESOLVED_STATUSES } from "../../../constants/ticket";
import { userRepository } from "../../auth/repositories/user.repository";
import { MODEL_PRICING_PER_MTOK } from "../../ai/config/ai.config";
import { aiUsageRepository } from "../../ai/repositories/ai-usage.repository";
import { aiClient } from "../../ai/services/ai-client.service";
import { ticketMessageRepository } from "../../tickets/repositories/ticket-message.repository";
import { ticketRepository } from "../../tickets/repositories/ticket.repository";

const USAGE_WINDOW_DAYS = 30;

const ratio = (part: number, whole: number) => (whole ? Number((part / whole).toFixed(3)) : null);

export class AdminDashboardService {
  /** Queue health + AI quality/cost metrics for the ops team. */
  async getStats(adminId: string) {
    const openFilter = { status: { $in: UNRESOLVED_STATUSES } };
    const now = new Date();
    const usageSince = new Date(now.getTime() - USAGE_WINDOW_DAYS * 86_400_000);

    const [
      byStatus,
      openByPriority,
      openByCategory,
      slaBreached,
      unassigned,
      assignedToMe,
      overrides,
      replies,
      usageRows,
    ] = await Promise.all([
      ticketRepository.groupCount("status"),
      ticketRepository.groupCount("priority", openFilter),
      ticketRepository.groupCount("category", openFilter),
      ticketRepository.countBy({ ...openFilter, firstResponseAt: null, slaDueAt: { $lt: now } }),
      ticketRepository.countBy({ ...openFilter, assignee: null }),
      ticketRepository.countBy({ ...openFilter, assignee: adminId }),
      ticketRepository.aiOverrideStats(),
      ticketMessageRepository.countAiAssisted(),
      aiUsageRepository.summarizeSince(usageSince),
    ]);

    const usage = usageRows.map((row) => {
      const pricing = MODEL_PRICING_PER_MTOK[row._id.model];
      return {
        operation: row._id.operation,
        model: row._id.model,
        calls: row.calls,
        failures: row.failures,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        cacheReadTokens: row.cacheReadTokens,
        avgLatencyMs: Math.round(row.avgLatencyMs),
        estimatedCostUsd: pricing
          ? Number(
              (
                (row.inputTokens * pricing.input + row.outputTokens * pricing.output) /
                1_000_000
              ).toFixed(4),
            )
          : null,
      };
    });

    return {
      queue: {
        byStatus,
        openByPriority,
        openByCategory,
        slaBreached,
        unassigned,
        assignedToMe,
      },
      ai: {
        status: aiClient.getStatus(),
        // Share of AI suggestions the admins kept — a live proxy for classification accuracy.
        categoryAgreementRate: ratio(
          overrides.triaged - overrides.categoryOverridden,
          overrides.triaged,
        ),
        priorityAgreementRate: ratio(
          overrides.triaged - overrides.priorityOverridden,
          overrides.triaged,
        ),
        triagedByAi: overrides.triaged,
        repliesUsingAiDraft: replies.aiAssisted,
        totalReplies: replies.total,
        usageWindowDays: USAGE_WINDOW_DAYS,
        usage,
      },
    };
  }

  async listTeam() {
    const admins = await userRepository.findByRole("admin");
    return admins.map((admin) => ({ id: String(admin._id), name: admin.name, email: admin.email }));
  }
}

export const adminDashboardService = new AdminDashboardService();
