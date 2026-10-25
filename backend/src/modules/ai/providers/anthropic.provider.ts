import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AiOutputError } from "../errors";
import type { AiFailureReason, AiUsage } from "../types/ai.types";
import type {
  LlmProvider,
  LlmRequestOptions,
  LlmResult,
  StructuredRequest,
  TextRequest,
} from "./llm-provider";

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

const fallbackParams = (model: string) =>
  SERVER_FALLBACK_MODELS.has(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};

function toUsage(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): AiUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic" as const;
  private readonly client: Anthropic;

  constructor(apiKey: string, maxRetries: number) {
    this.client = new Anthropic({ apiKey, maxRetries });
  }

  async generateStructured<T>(
    request: StructuredRequest<T>,
    options: LlmRequestOptions,
  ): Promise<LlmResult<T>> {
    const message = await this.client.beta.messages.parse(
      {
        model: request.model,
        max_tokens: request.maxTokens,
        // Static system prompt marked cacheable; only the user message changes per call.
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: request.user }],
        output_config: { effort: request.effort, format: betaZodOutputFormat(request.schema) },
        ...fallbackParams(request.model),
      },
      options,
    );

    if (message.stop_reason === "refusal") {
      throw new AiOutputError("refusal", "Model declined the request.");
    }
    if (!message.parsed_output) {
      throw new AiOutputError(
        "invalid_output",
        `Unparseable output (stop: ${message.stop_reason}).`,
      );
    }

    return {
      value: message.parsed_output as T,
      model: message.model,
      usage: toUsage(message.usage),
    };
  }

  async generateText(request: TextRequest, options: LlmRequestOptions): Promise<LlmResult<string>> {
    const message = await this.client.beta.messages.create(
      {
        model: request.model,
        max_tokens: request.maxTokens,
        system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: request.user }],
        output_config: { effort: request.effort },
        ...fallbackParams(request.model),
      },
      options,
    );

    if (message.stop_reason === "refusal") {
      throw new AiOutputError("refusal", "Model declined the request.");
    }
    if (message.stop_reason === "max_tokens") {
      throw new AiOutputError("invalid_output", "Output was cut off by the token limit.");
    }

    const text = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();
    if (!text) {
      throw new AiOutputError("invalid_output", "Model returned an empty answer.");
    }

    return { value: text, model: message.model, usage: toUsage(message.usage) };
  }

  classifyError(error: unknown): AiFailureReason | null {
    // Order matters: specific subclasses before their parents.
    if (error instanceof Anthropic.APIUserAbortError) return "timeout"; // overall deadline hit
    if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
    if (error instanceof Anthropic.APIConnectionError) return "provider_error";
    if (error instanceof Anthropic.RateLimitError) return "rate_limited";
    if (error instanceof Anthropic.AuthenticationError) return "auth_error";
    if (error instanceof Anthropic.PermissionDeniedError) return "auth_error";
    if (error instanceof Anthropic.APIError) return "provider_error";
    return null;
  }
}
