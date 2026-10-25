import type { Types } from "mongoose";
import { logger } from "../../../config/logger";
import { AI_CONFIG } from "../config/ai.config";
import { AiOutputError } from "../errors";
import { AnthropicProvider } from "../providers/anthropic.provider";
import { GroqProvider } from "../providers/groq.provider";
import type { LlmProvider, LlmRequestOptions, LlmResult } from "../providers/llm-provider";
import { aiUsageRepository } from "../repositories/ai-usage.repository";
import type { AiCallResult, AiFailureReason, AiOperation, AiUsage } from "../types/ai.types";

type Executor<T> = (provider: LlmProvider, options: LlmRequestOptions) => Promise<LlmResult<T>>;

/** Failures that say "the provider is unhealthy" — these count towards opening the circuit. */
const CIRCUIT_FAILURES = new Set<AiFailureReason>([
  "rate_limited",
  "timeout",
  "provider_error",
  "auth_error",
]);

const FAILURE_MESSAGES: Record<AiFailureReason, string> = {
  disabled: "AI assistance is not configured on this server.",
  circuit_open: "AI assistance is temporarily paused after repeated provider errors.",
  rate_limited: "The AI provider is rate-limiting requests right now.",
  timeout: "The AI provider did not respond in time.",
  provider_error: "The AI provider returned an error.",
  auth_error: "The AI provider rejected our credentials.",
  refusal: "The AI model declined to answer this request.",
  invalid_output: "The AI response could not be used.",
};

function createProvider(): LlmProvider | null {
  if (!AI_CONFIG.apiKey) {
    return null;
  }
  return AI_CONFIG.provider === "groq"
    ? new GroqProvider(AI_CONFIG.apiKey, AI_CONFIG.maxRetries)
    : new AnthropicProvider(AI_CONFIG.apiKey, AI_CONFIG.maxRetries);
}

/**
 * Single gateway to the LLM provider. Every call goes through here, which gives us:
 * - graceful degradation (callers always get a result object, never an exception),
 * - a circuit breaker so an outage doesn't add a timeout to every ticket,
 * - per-call token/latency logging for cost tracking.
 * The API key is read from the environment only and never leaves the server.
 */
export class AiClientService {
  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(private readonly provider: LlmProvider | null) {}

  get isEnabled() {
    return this.provider !== null;
  }

  getStatus() {
    const circuitOpen = Date.now() < this.circuitOpenUntil;
    return {
      enabled: this.isEnabled,
      available: this.isEnabled && !circuitOpen,
      provider: AI_CONFIG.provider,
      circuitOpen,
      circuitOpenUntil: circuitOpen ? new Date(this.circuitOpenUntil).toISOString() : null,
      triageModel: AI_CONFIG.triage.model,
      draftModel: AI_CONFIG.draft.model,
    };
  }

  async execute<T>(
    operation: AiOperation,
    context: { ticketId: string | Types.ObjectId | null; model: string; deadlineMs: number },
    executor: Executor<T>,
  ): Promise<AiCallResult<T>> {
    if (!this.provider) {
      return { ok: false, reason: "disabled", message: FAILURE_MESSAGES.disabled };
    }

    if (Date.now() < this.circuitOpenUntil) {
      return { ok: false, reason: "circuit_open", message: FAILURE_MESSAGES.circuit_open };
    }

    const startedAt = Date.now();
    try {
      // SDK retries multiply the per-attempt timeout; the abort signal caps the total wait,
      // so an admin never waits longer than the deadline before falling back.
      const result = await executor(this.provider, {
        timeout: context.deadlineMs,
        signal: AbortSignal.timeout(context.deadlineMs),
      });
      this.consecutiveFailures = 0;
      this.recordUsage(operation, context, {
        model: result.model,
        success: true,
        usage: result.usage,
        latencyMs: Date.now() - startedAt,
      });
      return { ok: true, ...result };
    } catch (error) {
      const reason =
        error instanceof AiOutputError
          ? error.reason
          : (this.provider.classifyError(error) ?? "invalid_output");
      this.registerFailure(reason);
      logger.warn({ err: error, operation, reason, ticketId: context.ticketId }, "AI call failed");
      this.recordUsage(operation, context, {
        model: context.model,
        success: false,
        failureReason: reason,
        latencyMs: Date.now() - startedAt,
      });
      return { ok: false, reason, message: FAILURE_MESSAGES[reason] };
    }
  }

  private registerFailure(reason: AiFailureReason) {
    if (!CIRCUIT_FAILURES.has(reason)) {
      return;
    }

    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= AI_CONFIG.circuit.failureThreshold) {
      this.circuitOpenUntil = Date.now() + AI_CONFIG.circuit.cooldownMs;
      this.consecutiveFailures = 0;
      logger.error(
        { cooldownMs: AI_CONFIG.circuit.cooldownMs },
        "AI circuit opened — using fallbacks until cooldown ends",
      );
    }
  }

  private recordUsage(
    operation: AiOperation,
    context: { ticketId: string | Types.ObjectId | null },
    entry: {
      model: string;
      success: boolean;
      failureReason?: AiFailureReason;
      usage?: AiUsage;
      latencyMs: number;
    },
  ) {
    // Fire-and-forget: usage logging must never break or slow down the request.
    aiUsageRepository
      .log({ operation, ticketId: context.ticketId, ...entry })
      .catch((error) => logger.warn({ err: error }, "Failed to record AI usage"));
  }
}

export const aiClient = new AiClientService(createProvider());
