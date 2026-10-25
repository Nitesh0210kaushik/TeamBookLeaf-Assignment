import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import type { AiProviderName } from "../../../constants/ai";

type ProviderDefaults = {
  triageModel: string;
  draftModel: string;
  triageMaxTokens: number;
  draftMaxTokens: number;
};

/**
 * Sensible defaults per provider. Anthropic: Claude Opus 5.5 for tone and policy accuracy.
 * Groq (free tier): gpt-oss models — production models with strict JSON-schema output;
 * the smaller one for classification, the larger one for author-facing replies.
 * Token caps include the model's reasoning tokens.
 */
const PROVIDER_DEFAULTS: Record<AiProviderName, ProviderDefaults> = {
  anthropic: {
    triageModel: "claude-opus-5-5",
    draftModel: "claude-opus-5-5",
    triageMaxTokens: 4_000,
    draftMaxTokens: 8_000,
  },
  groq: {
    triageModel: "openai/gpt-oss-20b",
    draftModel: "openai/gpt-oss-120b",
    triageMaxTokens: 2_000,
    draftMaxTokens: 4_000,
  },
};

const provider = env.AI_PROVIDER;
const defaults = PROVIDER_DEFAULTS[provider];

/** An explicitly configured model wins, unless it obviously belongs to the other provider. */
function resolveModel(configured: string | undefined, fallback: string, key: string) {
  if (!configured) return fallback;
  const looksLikeClaude = configured.startsWith("claude-");
  if ((provider === "groq") === looksLikeClaude) {
    logger.warn(
      { key, configured, provider, using: fallback },
      "Model does not match AI_PROVIDER; using default",
    );
    return fallback;
  }
  return configured;
}

export const AI_CONFIG = {
  provider,
  apiKey: provider === "groq" ? env.GROQ_API_KEY : env.ANTHROPIC_API_KEY,
  triage: {
    model: resolveModel(env.AI_TRIAGE_MODEL, defaults.triageModel, "AI_TRIAGE_MODEL"),
    /** Overall deadline including SDK retries; triage runs in the background. */
    timeoutMs: env.AI_TRIAGE_TIMEOUT_MS,
    // Classification is a narrow task: low effort keeps latency and reasoning tokens down.
    effort: "low" as const,
    maxTokens: defaults.triageMaxTokens,
  },
  draft: {
    model: resolveModel(env.AI_DRAFT_MODEL, defaults.draftModel, "AI_DRAFT_MODEL"),
    /** Overall deadline including retries — an admin is waiting on this one. */
    timeoutMs: env.AI_DRAFT_TIMEOUT_MS,
    effort: "medium" as const,
    maxTokens: defaults.draftMaxTokens,
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
 * USD per million tokens — used only to show an estimated spend in the admin dashboard.
 * Groq's free tier costs nothing; its paid prices aren't tracked here.
 */
export const MODEL_PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};
