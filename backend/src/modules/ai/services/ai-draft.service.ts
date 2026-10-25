import type { Types } from "mongoose";
import { AI_CONFIG, supportsServerFallback } from "../config/ai.config";
import { buildTemplateDraft } from "../fallback/template-drafts";
import { buildDraftSystemPrompt, buildDraftUserMessage } from "../prompts/draft.prompt";
import type { DraftInput, DraftResult } from "../types/ai.types";
import { AiOutputError, aiClient, toUsage } from "./ai-client.service";

export class AiDraftService {
  /**
   * Drafts a reply grounded in the knowledge base and the author's real account facts.
   * Always resolves: on any AI failure the admin gets a policy-accurate template instead.
   */
  async draft(input: DraftInput, ticketId: string | Types.ObjectId): Promise<DraftResult> {
    const { model, maxTokens, effort, timeoutMs } = AI_CONFIG.draft;
    const system = buildDraftSystemPrompt(input.category);

    const outcome = await aiClient.execute<string>("draft", { ticketId, model }, async (client) => {
      const message = await client.beta.messages.create(
        {
          model,
          max_tokens: maxTokens,
          system: [{ type: "text", text: system.prompt, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: buildDraftUserMessage(input) }],
          output_config: { effort },
          ...(supportsServerFallback(model)
            ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
            : {}),
        },
        { timeout: timeoutMs },
      );

      if (message.stop_reason === "refusal") {
        throw new AiOutputError("refusal", "Model declined to draft a reply.");
      }
      if (message.stop_reason === "max_tokens") {
        throw new AiOutputError("invalid_output", "Draft was cut off by the token limit.");
      }

      const text = message.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("")
        .trim();

      if (!text) {
        throw new AiOutputError("invalid_output", "Model returned an empty draft.");
      }

      return { value: text, model: message.model, usage: toUsage(message.usage) };
    });

    if (outcome.ok) {
      return {
        content: outcome.value,
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
