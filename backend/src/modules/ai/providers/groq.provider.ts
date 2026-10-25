import Groq from "groq-sdk";
import { z } from "zod";
import { AiOutputError } from "../errors";
import type { AiFailureReason, AiUsage } from "../types/ai.types";
import type {
  LlmProvider,
  LlmRequestOptions,
  LlmResult,
  StructuredRequest,
  TextRequest,
} from "./llm-provider";

type GroqUsage = { prompt_tokens: number; completion_tokens: number } | null | undefined;

function toUsage(usage: GroqUsage): AiUsage {
  return {
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
}

/**
 * Groq (OpenAI-compatible chat completions) with the official `groq-sdk`.
 * Structured output uses `json_schema` with `strict: true` — constrained decoding on the
 * gpt-oss models — and the result is still validated against the same Zod schema.
 */
export class GroqProvider implements LlmProvider {
  readonly name = "groq" as const;
  private readonly client: Groq;

  constructor(apiKey: string, maxRetries: number) {
    this.client = new Groq({ apiKey, maxRetries });
  }

  async generateStructured<T>(
    request: StructuredRequest<T>,
    options: LlmRequestOptions,
  ): Promise<LlmResult<T>> {
    const completion = await this.client.chat.completions.create(
      {
        model: request.model,
        max_completion_tokens: request.maxTokens,
        reasoning_effort: request.effort,
        // Keep the model's reasoning out of the answer; we only want the JSON.
        include_reasoning: false,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: z.toJSONSchema(request.schema, { target: "draft-7" }) as Record<
              string,
              unknown
            >,
          },
        },
      },
      options,
    );

    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") {
      throw new AiOutputError("invalid_output", "Output was cut off by the token limit.");
    }

    let json: unknown;
    try {
      json = JSON.parse(choice?.message?.content ?? "");
    } catch {
      throw new AiOutputError("invalid_output", "Model returned invalid JSON.");
    }

    const parsed = request.schema.safeParse(json);
    if (!parsed.success) {
      throw new AiOutputError("invalid_output", "Model output did not match the schema.");
    }

    return { value: parsed.data, model: completion.model, usage: toUsage(completion.usage) };
  }

  async generateText(request: TextRequest, options: LlmRequestOptions): Promise<LlmResult<string>> {
    const completion = await this.client.chat.completions.create(
      {
        model: request.model,
        max_completion_tokens: request.maxTokens,
        reasoning_effort: request.effort,
        include_reasoning: false,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      },
      options,
    );

    const choice = completion.choices[0];
    if (choice?.finish_reason === "length") {
      throw new AiOutputError("invalid_output", "Output was cut off by the token limit.");
    }

    const text = choice?.message?.content?.trim() ?? "";
    if (!text) {
      throw new AiOutputError("invalid_output", "Model returned an empty answer.");
    }

    return { value: text, model: completion.model, usage: toUsage(completion.usage) };
  }

  classifyError(error: unknown): AiFailureReason | null {
    // Order matters: specific subclasses before their parents.
    if (error instanceof Groq.APIUserAbortError) return "timeout"; // overall deadline hit
    if (error instanceof Groq.APIConnectionTimeoutError) return "timeout";
    if (error instanceof Groq.APIConnectionError) return "provider_error";
    if (error instanceof Groq.RateLimitError) return "rate_limited";
    if (error instanceof Groq.AuthenticationError) return "auth_error";
    if (error instanceof Groq.PermissionDeniedError) return "auth_error";
    if (error instanceof Groq.APIError) return "provider_error";
    return null;
  }
}
