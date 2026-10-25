import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../../config/env";
import type { UserRole } from "../../../constants/roles";

const ISSUER = "bookleaf-support-api";

type AccessTokenPayload = {
  sub: string;
  role: UserRole;
};

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: ISSUER,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  // Pinning the algorithm rejects tokens that try to switch it (e.g. "none").
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"], issuer: ISSUER });
  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("Malformed access token.");
  }
  return { sub: decoded.sub, role: decoded.role as UserRole };
}

/** Converts "12h" / "7d" style durations to milliseconds (used for the cookie max-age). */
export function durationToMs(duration: string) {
  const value = Number.parseInt(duration, 10);
  const unit = duration.slice(-1);
  const multipliers: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (multipliers[unit] ?? 1_000);
}
