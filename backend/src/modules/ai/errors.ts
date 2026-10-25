import type { AiFailureReason } from "./types/ai.types";

/** Thrown by a provider when the model answered but the answer is unusable. */
export class AiOutputError extends Error {
  constructor(
    public readonly reason: Extract<AiFailureReason, "refusal" | "invalid_output">,
    message: string,
  ) {
    super(message);
  }
}
