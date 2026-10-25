import type { Types } from "mongoose";
import { AI_CONFIG } from "../config/ai.config";
import { applyPolicyGuardrails } from "../fallback/policy-guardrails";
import { classifyWithRules } from "../fallback/rule-classifier";
import {
  TRIAGE_SYSTEM_PROMPT,
  buildTriageUserMessage,
  triageOutputSchema,
  type TriageModelOutput,
} from "../prompts/triage.prompt";
import type { TriageInput, TriageResult } from "../types/ai.types";
import { aiClient } from "./ai-client.service";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Capitalised and ending in punctuation, so guardrail notes can be appended cleanly. */
function asSentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capitalised = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}

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
      (provider, requestOptions) =>
        provider.generateStructured(
          {
            model,
            maxTokens,
            effort,
            // Identical for every ticket, so providers can cache it.
            system: TRIAGE_SYSTEM_PROMPT,
            user: buildTriageUserMessage(input),
            schema: triageOutputSchema,
            schemaName: "ticket_triage",
          },
          requestOptions,
        ),
    );

    const base = outcome.ok
      ? {
          category: outcome.value.category,
          priority: outcome.value.priority,
          confidence: clamp01(outcome.value.confidence),
          reasoning: asSentence(outcome.value.reasoning),
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
