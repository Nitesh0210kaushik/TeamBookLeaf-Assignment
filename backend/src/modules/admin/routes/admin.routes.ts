import { Router } from "express";
import { requireAuth, requireRoles } from "../../../middlewares/auth";
import { getStats, listTeam } from "../controllers/admin.controller";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRoles("admin"));
adminRoutes.get("/stats", getStats);
adminRoutes.get("/team", listTeam);
