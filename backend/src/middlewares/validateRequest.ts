import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { z } from "zod";
import { ApiError } from "../utils/ApiError";

type ValidationSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

function toDetails(error: z.ZodError) {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_root";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

/**
 * Validates and *replaces* body/params/query with the parsed values, so controllers
 * always receive trimmed, coerced, defaulted data. Every failing field is reported.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const part of ["params", "query", "body"] as const) {
      const schema = schemas[part];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const firstMessage = result.error.issues[0]?.message ?? `Invalid request ${part}.`;
        return next(ApiError.badRequest(firstMessage, toDetails(result.error)));
      }

      req[part] = result.data as never;
    }

    return next();
  };
}
