import type { ZodType } from "zod";
import type { AiProviderName } from "../../../constants/ai";
import type { AiFailureReason, AiUsage } from "../types/ai.types";

/** Per-attempt timeout plus an abort signal that caps the whole call (including SDK retries). */
export type LlmRequestOptions = { timeout: number; signal: AbortSignal };

export type LlmResult<T> = { value: T; model: string; usage: AiUsage };

export type TextRequest = {
  model: string;
  /** Static instructions — identical across calls of the same kind, so providers can cache them. */
  system: string;
  user: string;
  maxTokens: number;
  /** How much reasoning to spend; providers map this to their own setting. */
  effort: "low" | "medium";
};

export type StructuredRequest<T> = TextRequest & { schema: ZodType<T>; schemaName: string };

/**
 * The only surface the AI services depend on. Prompts, knowledge base, guardrails, fallbacks,
 * circuit breaker and usage logging are provider-agnostic; each provider just maps these two
 * calls onto its own SDK and translates its errors.
 */
export interface LlmProvider {
  readonly name: AiProviderName;
  /** JSON output validated against `schema`; throws AiOutputError when it can't be used. */
  generateStructured<T>(
    request: StructuredRequest<T>,
    options: LlmRequestOptions,
  ): Promise<LlmResult<T>>;
  /** Plain-text output; throws AiOutputError on refusal, truncation or an empty answer. */
  generateText(request: TextRequest, options: LlmRequestOptions): Promise<LlmResult<string>>;
  /** Maps an SDK error to a failure reason, or null if the error isn't from this SDK. */
  classifyError(error: unknown): AiFailureReason | null;
}
