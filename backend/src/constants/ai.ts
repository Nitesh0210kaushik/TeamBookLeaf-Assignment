export const AI_PROVIDERS = ["anthropic", "groq"] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];
