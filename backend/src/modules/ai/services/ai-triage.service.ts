import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Types } from "mongoose";
import { AI_CONFIG, supportsServerFallback } from "../config/ai.config";
import { applyPolicyGuardrails } from "../fallback/policy-guardrails";
import { classifyWithRules } from "../fallback/rule-classifier";
import {
  TRIAGE_SYSTEM_PROMPT,
  buildTriageUserMessage,
  triageOutputSchema,
  type TriageModelOutput,
} from "../prompts/triage.prompt";
import type { TriageInput, TriageResult } from "../types/ai.types";
import { AiOutputError, aiClient, toUsage } from "./ai-client.service";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export class AiTriageService {
  /**
   * Classifies a ticket's category and priority. Always resolves: if the model is unavailable
   * or its answer is unusable, the rule-based classifier takes over. Policy guardrails run last.
   */
  async triage(
    input: TriageInput,
    ticketId: string | Types.ObjectId | null,
  ): Promise<TriageResult> {
    const { model, maxTokens, effort, timeoutMs } = AI_CONFIG.triage;

    const outcome = await aiClient.execute<TriageModelOutput>(
      "triage",
      { ticketId, model, deadlineMs: timeoutMs },
      async (client, requestOptions) => {
        const message = await client.beta.messages.parse(
          {
            model,
            max_tokens: maxTokens,
            // The system prompt is identical for every ticket, so it is marked cacheable.
            system: [
              { type: "text", text: TRIAGE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
            ],
            messages: [{ role: "user", content: buildTriageUserMessage(input) }],
            output_config: { effort, format: betaZodOutputFormat(triageOutputSchema) },
            ...(supportsServerFallback(model)
              ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
              : {}),
          },
          requestOptions,
        );

        if (message.stop_reason === "refusal") {
          throw new AiOutputError("refusal", "Model declined to classify the ticket.");
        }
        if (!message.parsed_output) {
          throw new AiOutputError(
            "invalid_output",
            `Unparseable triage output (stop: ${message.stop_reason}).`,
          );
        }

        return {
          value: message.parsed_output,
          model: message.model,
          usage: toUsage(message.usage),
        };
      },
    );

    const base = outcome.ok
      ? {
          category: outcome.value.category,
          priority: outcome.value.priority,
          confidence: clamp01(outcome.value.confidence),
          reasoning: outcome.value.reasoning.trim(),
          source: "ai" as const,
          model: outcome.model,
          fallbackReason: null,
        }
      : {
          ...classifyWithRules(input),
          source: "rules" as const,
          model: null,
          fallbackReason: outcome.reason,
        };

    const guarded = applyPolicyGuardrails(base, input);
    return {
      ...base,
      priority: guarded.priority,
      reasoning: [base.reasoning, ...guarded.applied].join(" "),
    };
  }
}

export const aiTriageService = new AiTriageService();
