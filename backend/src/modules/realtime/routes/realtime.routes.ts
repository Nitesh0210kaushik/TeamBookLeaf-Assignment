import { Router } from "express";
import { requireAuth } from "../../../middlewares/auth";
import { streamEvents } from "../controllers/realtime.controller";

export const realtimeRoutes = Router();

realtimeRoutes.get("/stream", requireAuth, streamEvents);
