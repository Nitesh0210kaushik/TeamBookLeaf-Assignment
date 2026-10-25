import type { Request, Response } from "express";
import { logger } from "../../../config/logger";
import type { AuthUser } from "../../../middlewares/auth";

type Subscriber = {
  res: Response;
  userId: string;
  role: AuthUser["role"];
  authorId: string | null;
};

export type TicketUpdateReason =
  "created" | "triaged" | "updated" | "admin_replied" | "author_replied" | "note_added";

const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events hub. Events only carry ids + a reason; clients refetch through the REST API,
 * so role-based access control is enforced in exactly one place and nothing private is pushed.
 *
 * Note: subscribers are held in this process's memory. Running several API instances would need a
 * shared pub/sub (Redis, or MongoDB change streams) — see README "Scaling".
 */
export class RealtimeService {
  private readonly subscribers = new Set<Subscriber>();

  subscribe(req: Request, res: Response, user: AuthUser) {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    // Tell EventSource to reconnect after 5s if the connection drops.
    res.write(`retry: 5000\nevent: connected\ndata: {}\n\n`);

    const subscriber: Subscriber = {
      res,
      userId: user.id,
      role: user.role,
      authorId: user.authorId,
    };
    this.subscribers.add(subscriber);

    const heartbeat = setInterval(() => res.write(`: ping\n\n`), HEARTBEAT_MS);
    req.on("close", () => {
      clearInterval(heartbeat);
      this.subscribers.delete(subscriber);
    });
  }

  /** Notifies admins and the owning author that a ticket changed. */
  publishTicketUpdate(
    ticket: { id: string; authorId: string },
    reason: TicketUpdateReason,
    options: { adminsOnly?: boolean } = {},
  ) {
    const payload = `event: ticket.updated\ndata: ${JSON.stringify({ ticketId: ticket.id, reason })}\n\n`;

    for (const subscriber of this.subscribers) {
      const isRecipient =
        subscriber.role === "admin" ||
        (!options.adminsOnly && subscriber.authorId === ticket.authorId);

      if (!isRecipient) {
        continue;
      }

      try {
        subscriber.res.write(payload);
      } catch (error) {
        logger.debug({ err: error }, "Dropping broken SSE subscriber");
        this.subscribers.delete(subscriber);
      }
    }
  }

  get connectionCount() {
    return this.subscribers.size;
  }
}

export const realtimeService = new RealtimeService();
