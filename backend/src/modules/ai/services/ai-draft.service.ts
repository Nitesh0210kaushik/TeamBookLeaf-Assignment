import type { Types } from "mongoose";
import { AI_CONFIG } from "../config/ai.config";
import { buildTemplateDraft } from "../fallback/template-drafts";
import { buildDraftSystemPrompt, buildDraftUserMessage } from "../prompts/draft.prompt";
import type { DraftInput, DraftResult } from "../types/ai.types";
import { toPlainText } from "../utils/plain-text";
import { aiClient } from "./ai-client.service";

export class AiDraftService {
  /**
   * Drafts a reply grounded in the knowledge base and the author's real account facts.
   * Always resolves: on any AI failure the admin gets a policy-accurate template instead.
   */
  async draft(input: DraftInput, ticketId: string | Types.ObjectId): Promise<DraftResult> {
    const { model, maxTokens, effort, timeoutMs } = AI_CONFIG.draft;
    const system = buildDraftSystemPrompt(input.category);

    const outcome = await aiClient.execute<string>(
      "draft",
      { ticketId, model, deadlineMs: timeoutMs },
      (provider, requestOptions) =>
        provider.generateText(
          {
            model,
            maxTokens,
            effort,
            // Same for every ticket in a category, so providers can cache it.
            system: system.prompt,
            user: buildDraftUserMessage(input),
          },
          requestOptions,
        ),
    );

    if (outcome.ok) {
      return {
        content: toPlainText(outcome.value),
        source: "ai",
        model: outcome.model,
        knowledgeSections: system.sections,
        fallbackReason: null,
        usage: outcome.usage,
      };
    }

    return {
      content: buildTemplateDraft(input),
      source: "template",
      model: null,
      knowledgeSections: [],
      fallbackReason: outcome.reason,
      usage: null,
    };
  }
}

export const aiDraftService = new AiDraftService();
