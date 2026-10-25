import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles } from "../../../middlewares/auth";
import { validateRequest } from "../../../middlewares/validateRequest";
import { objectIdSchema } from "../../books/validations/book.validation";
import { getAuthorAccount, getMyAccount, listAuthors } from "../controllers/author.controller";

export const authorRoutes = Router();

authorRoutes.use(requireAuth);
authorRoutes.get("/me", requireRoles("author"), getMyAccount);
authorRoutes.get("/", requireRoles("admin"), listAuthors);
authorRoutes.get(
  "/:authorId",
  requireRoles("admin"),
  validateRequest({ params: z.object({ authorId: objectIdSchema("author id") }) }),
  getAuthorAccount,
);
