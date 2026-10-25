import type { CookieOptions, Response } from "express";
import { env } from "../../../config/env";
import { durationToMs } from "./token";

// httpOnly keeps the token away from page JavaScript; SameSite=lax blocks cross-site POSTs.
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax",
  path: "/",
};

export function setAuthCookie(res: Response, token: string) {
  res.cookie(env.AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: durationToMs(env.JWT_EXPIRES_IN),
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(env.AUTH_COOKIE_NAME, baseCookieOptions);
}
