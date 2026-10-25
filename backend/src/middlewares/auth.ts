import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import type { UserRole } from "../constants/roles";
import { userRepository } from "../modules/auth/repositories/user.repository";
import { verifyAccessToken } from "../modules/auth/utils/token";
import { ApiError } from "../utils/ApiError";

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  /** Linked author profile id — set for authors, null for admins. */
  authorId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return req.cookies?.[env.AUTH_COOKIE_NAME];
}

/**
 * Accepts the session cookie (browser) or a Bearer token (Postman / API clients).
 * The user is re-loaded on every request so a deleted or re-linked account loses access immediately.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(ApiError.unauthenticated());
  }

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    return next(
      ApiError.unauthenticated("Your session is invalid or has expired. Please log in again."),
    );
  }

  try {
    const user = await userRepository.findById(userId);
    if (!user) {
      return next(ApiError.unauthenticated("User account no longer exists."));
    }

    req.user = {
      id: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email,
      authorId: user.author ? String(user.author) : null,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthenticated());
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }

    return next();
  };
}
