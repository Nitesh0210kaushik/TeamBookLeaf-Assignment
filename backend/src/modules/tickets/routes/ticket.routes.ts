import { Router } from "express";
import { requireAuth, requireRoles } from "../../../middlewares/auth";
import { aiRateLimiter } from "../../../middlewares/rateLimiter";
import { validateRequest } from "../../../middlewares/validateRequest";
import {
  addMessage,
  addNote,
  createTicket,
  getDraft,
  getTicket,
  listTickets,
  regenerateDraft,
  rerunTriage,
  updateTicket,
} from "../controllers/ticket.controller";
import {
  addMessageSchema,
  addNoteSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketParamsSchema,
  updateTicketSchema,
} from "../validations/ticket.validation";

export const ticketRoutes = Router();

const withTicketId = validateRequest({ params: ticketParamsSchema });

ticketRoutes.use(requireAuth);

// Shared (scoped by role inside the service)
ticketRoutes.get("/", validateRequest({ query: listTicketsQuerySchema }), listTickets);
ticketRoutes.get("/:ticketId", withTicketId, getTicket);
ticketRoutes.post(
  "/:ticketId/messages",
  withTicketId,
  validateRequest({ body: addMessageSchema }),
  addMessage,
);

// Author only
ticketRoutes.post(
  "/",
  requireRoles("author"),
  validateRequest({ body: createTicketSchema }),
  createTicket,
);

// Admin only
ticketRoutes.patch(
  "/:ticketId",
  requireRoles("admin"),
  withTicketId,
  validateRequest({ body: updateTicketSchema }),
  updateTicket,
);
ticketRoutes.post(
  "/:ticketId/notes",
  requireRoles("admin"),
  withTicketId,
  validateRequest({ body: addNoteSchema }),
  addNote,
);
// GET serves the cached draft (one AI call per conversation state), so only explicit
// regenerate / re-triage requests are rate-limited.
ticketRoutes.get("/:ticketId/ai-draft", requireRoles("admin"), withTicketId, getDraft);
ticketRoutes.post(
  "/:ticketId/ai-draft",
  requireRoles("admin"),
  withTicketId,
  aiRateLimiter,
  regenerateDraft,
);
ticketRoutes.post(
  "/:ticketId/ai-triage",
  requireRoles("admin"),
  withTicketId,
  aiRateLimiter,
  rerunTriage,
);
