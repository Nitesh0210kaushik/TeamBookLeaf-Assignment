import { Router } from "express";
import { optionalAuth, requireAuth } from "../../../middlewares/auth";
import { loginRateLimiter } from "../../../middlewares/rateLimiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import { getMe, getSession, login, logout } from "../controllers/auth.controller";
import { loginSchema } from "../validations/auth.validation";

export const authRoutes = Router();

authRoutes.post("/login", loginRateLimiter, validateRequest({ body: loginSchema }), login);
authRoutes.post("/logout", logout);
authRoutes.get("/session", optionalAuth, getSession);
authRoutes.get("/me", requireAuth, getMe);
