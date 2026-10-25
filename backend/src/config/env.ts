import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

const durationPattern = /^\d+[smhd]$/;

const booleanString = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false) {
    return false;
  }

  return value;
}, z.boolean().optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    API_PREFIX: z.string().startsWith("/").default("/api/v1"),
    FRONTEND_URL: z.string().default("http://localhost:5173"),
    MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/bookleaf_support"),

    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
    JWT_EXPIRES_IN: z.string().regex(durationPattern).default("12h"),
    AUTH_COOKIE_NAME: z.string().min(1).default("bookleaf_session"),
    COOKIE_SECURE: booleanString,

    // AI is optional by design: without a key the app runs in rule-based fallback mode.
    ANTHROPIC_API_KEY: z.string().optional(),
    AI_TRIAGE_MODEL: z.string().min(1).default("claude-opus-5-5"),
    AI_DRAFT_MODEL: z.string().min(1).default("claude-opus-5-5"),
    AI_TRIAGE_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
    AI_DRAFT_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
    AI_CIRCUIT_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(3),
    AI_CIRCUIT_COOLDOWN_MS: z.coerce.number().int().positive().default(60_000),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") {
      return;
    }

    if (value.JWT_SECRET.startsWith("change-me") || value.JWT_SECRET.length < 64) {
      ctx.addIssue({
        code: "custom",
        message: "JWT_SECRET must be a random string of at least 64 characters in production.",
        path: ["JWT_SECRET"],
      });
    }

    if (value.COOKIE_SECURE === false) {
      ctx.addIssue({
        code: "custom",
        message: "COOKIE_SECURE must be true in production.",
        path: ["COOKIE_SECURE"],
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "Invalid backend environment variables:",
    z.flattenError(parsedEnv.error).fieldErrors,
  );
  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  ANTHROPIC_API_KEY: parsedEnv.data.ANTHROPIC_API_KEY?.trim() || undefined,
  COOKIE_SECURE: parsedEnv.data.COOKIE_SECURE ?? parsedEnv.data.NODE_ENV === "production",
};

export const allowedOrigins = env.FRONTEND_URL.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
