import { Router } from "express";
import { apiRateLimiter } from "../middlewares/rateLimiter";
import { adminRoutes } from "../modules/admin/routes/admin.routes";
import { authRoutes } from "../modules/auth/routes/auth.routes";
import { authorRoutes } from "../modules/authors/routes/author.routes";
import { bookRoutes } from "../modules/books/routes/book.routes";
import { docsRoutes } from "../modules/docs/routes/docs.routes";
import { healthRoutes } from "../modules/health/routes/health.routes";
import { realtimeRoutes } from "../modules/realtime/routes/realtime.routes";
import { ticketRoutes } from "../modules/tickets/routes/ticket.routes";

export const apiRoutes = Router();

apiRoutes.use("/health", healthRoutes);
apiRoutes.use("/docs", docsRoutes);
apiRoutes.use("/realtime", realtimeRoutes);
apiRoutes.use(apiRateLimiter);
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/authors", authorRoutes);
apiRoutes.use("/books", bookRoutes);
apiRoutes.use("/tickets", ticketRoutes);
apiRoutes.use("/admin", adminRoutes);
