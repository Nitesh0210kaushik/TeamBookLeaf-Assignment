import { env } from "../../../config/env";

export const AI_CONFIG = {
  triage: {
    model: env.AI_TRIAGE_MODEL,
    /** Overall deadline including SDK retries; triage runs in the background. */
    timeoutMs: env.AI_TRIAGE_TIMEOUT_MS,
    // Classification is a narrow task: low effort keeps latency and thinking tokens down.
    effort: "low" as const,
    maxTokens: 4_000,
  },
  draft: {
    model: env.AI_DRAFT_MODEL,
    /** Overall deadline including retries — an admin is waiting on this one. */
    timeoutMs: env.AI_DRAFT_TIMEOUT_MS,
    effort: "medium" as const,
    maxTokens: 8_000,
  },
  /** SDK-level retries with exponential backoff for 429 / 5xx / connection errors. */
  maxRetries: 2,
  circuit: {
    failureThreshold: env.AI_CIRCUIT_FAILURE_THRESHOLD,
    cooldownMs: env.AI_CIRCUIT_COOLDOWN_MS,
  },
  /** Trimming limits — the main token-cost levers for drafting. */
  context: {
    maxConversationMessages: 6,
    maxCharsPerMessage: 1_500,
    maxTicketChars: 4_000,
  },
} as const;

/**
 * Models that accept server-side refusal fallbacks (`fallbacks: "default"`): if the model declines,
 * the API transparently re-runs the request on Anthropic's recommended fallback model.
 */
const SERVER_FALLBACK_MODELS = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-fable-5-1",
  "claude-fable-5",
  "claude-sonnet-5-5",
]);

export function supportsServerFallback(model: string) {
  return SERVER_FALLBACK_MODELS.has(model);
}

/** USD per million tokens — used only to show an estimated spend in the admin dashboard. */
export const MODEL_PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};
