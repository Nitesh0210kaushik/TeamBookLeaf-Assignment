import { ApiError } from "../../../utils/ApiError";
import { classifyWithRules } from "../../ai/fallback/rule-classifier";
import type { AiDraftRecord } from "../../ai/models/ai-draft.model";
import { aiDraftRepository } from "../../ai/repositories/ai-draft.repository";
import { aiClient } from "../../ai/services/ai-client.service";
import { aiDraftService } from "../../ai/services/ai-draft.service";
import { aiTriageService } from "../../ai/services/ai-triage.service";
import { realtimeService } from "../../realtime/services/realtime.service";
import { ticketEventRepository } from "../repositories/ticket-event.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import { priorityFields } from "./ticket-access";
import { ticketContextService } from "./ticket-context.service";

function toDraftDto(draft: AiDraftRecord, cached: boolean) {
  return {
    id: String(draft._id),
    content: draft.content,
    source: draft.source,
    model: draft.model ?? null,
    category: draft.category,
    knowledgeSections: draft.knowledgeSections ?? [],
    fallbackReason: draft.fallbackReason ?? null,
    basedOnMessageCount: draft.basedOnMessageCount,
    createdAt: draft.createdAt.toISOString(),
    cached,
  };
}

export class TicketAiService {
  /** Concurrent requests for the same ticket's draft share one AI call. */
  private readonly draftsInFlight = new Map<string, Promise<AiDraftRecord>>();

  /**
   * Classifies a ticket and stores the AI's suggestion. An admin's manual category or priority
   * is never overwritten — the new suggestion is recorded alongside it instead.
   */
  async runTriage(ticketId: string, actorId: string | null = null) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw ApiError.notFound("Ticket not found.");
    }

    const input = await ticketContextService.buildTriageInput(ticket);
    const result = await aiTriageService.triage(input, ticket._id);
    const now = new Date();

    const set: Record<string, unknown> = {
      triage: {
        status: result.source === "ai" ? "completed" : "fallback",
        suggestedCategory: result.category,
        suggestedPriority: result.priority,
        confidence: result.confidence,
        reasoning: result.reasoning,
        model: result.model,
        fallbackReason: result.fallbackReason,
        completedAt: now,
      },
    };
    if (ticket.categorySource !== "admin") {
      Object.assign(set, { category: result.category, categorySource: result.source });
    }
    if (ticket.prioritySource !== "admin") {
      Object.assign(set, priorityFields(result.priority, ticket.createdAt), {
        prioritySource: result.source,
      });
    }

    const updated = await ticketRepository.updateById(ticket._id, { $set: set });
    await ticketEventRepository.createMany([
      {
        ticketId: ticket._id,
        actorId,
        type: "triaged",
        to: `${result.category} / ${result.priority}`,
        meta: {
          source: result.source,
          confidence: result.confidence,
          fallbackReason: result.fallbackReason,
        },
      },
    ]);
    realtimeService.publishTicketUpdate(
      { id: String(ticket._id), authorId: String(ticket.author) },
      "triaged",
    );

    return updated!;
  }

  /**
   * Returns the reply draft for a ticket. Cached drafts are reused until the conversation changes,
   * so opening a ticket repeatedly costs one AI call, not one per view.
   */
  async getDraft(ticketId: string, requestedBy: string, options: { force: boolean }) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw ApiError.notFound("Ticket not found.");
    }

    const aiStatus = aiClient.getStatus();
    const latest = await aiDraftRepository.findLatestForTicket(ticket._id);
    const matchesConversation =
      latest?.basedOnMessageCount === ticket.messageCount && latest.category === ticket.category;
    // Reuse an AI draft; reuse a template only while the AI is still unavailable.
    const reusable =
      latest && matchesConversation && (latest.source === "ai" || !aiStatus.available);

    if (!options.force && reusable) {
      return { draft: toDraftDto(latest, true), ai: aiStatus };
    }

    const key = String(ticket._id);
    let pending = this.draftsInFlight.get(key);
    if (!pending) {
      pending = (async () => {
        // Triage normally finishes within seconds; if it hasn't, classify locally for the draft.
        const category =
          ticket.category ??
          classifyWithRules({
            subject: ticket.subject,
            description: ticket.description,
            book: null,
          }).category;
        const input = await ticketContextService.buildDraftInput(ticket, category);
        const draft = await aiDraftService.draft(input, ticket._id);
        return aiDraftRepository.create({
          ticketId: ticket._id,
          category,
          basedOnMessageCount: ticket.messageCount,
          requestedBy,
          draft,
        });
      })().finally(() => this.draftsInFlight.delete(key));
      this.draftsInFlight.set(key, pending);
    }

    const saved = await pending;
    return { draft: toDraftDto(saved, false), ai: aiClient.getStatus() };
  }
}

export const ticketAiService = new TicketAiService();
