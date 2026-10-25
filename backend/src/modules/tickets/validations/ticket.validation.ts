import { isValidObjectId } from "mongoose";
import { z } from "zod";
import {
  TICKET_CATEGORIES,
  TICKET_LIMITS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../../../constants/ticket";
import { objectIdSchema } from "../../books/validations/book.validation";

/** Accepts "open" or "open,in_progress" in query strings. */
const csvEnum = <T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(values, { error: `Invalid ${label}. Allowed: ${values.join(", ")}.` })));

/** Multipart forms send every field as a string; an empty one means "not provided". */
const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const formBoolean = z.preprocess(
  (value) => (value === "true" ? true : value === "false" ? false : emptyToUndefined(value)),
  z.boolean().optional(),
);

export const ticketParamsSchema = z.object({
  ticketId: objectIdSchema("ticket id"),
});

export const attachmentParamsSchema = z.object({
  ticketId: objectIdSchema("ticket id"),
  fileId: objectIdSchema("attachment id"),
});

/** Sent as multipart/form-data; files arrive separately in the `attachments` field. */
export const createTicketSchema = z.object({
  /** Omitted or empty = "General / Account Level". */
  bookId: z.preprocess(emptyToUndefined, objectIdSchema("book id").nullable().optional()),
  subject: z
    .string({ error: "Subject is required." })
    .trim()
    .min(5, "Subject must be at least 5 characters.")
    .max(
      TICKET_LIMITS.SUBJECT_MAX,
      `Subject cannot exceed ${TICKET_LIMITS.SUBJECT_MAX} characters.`,
    ),
  description: z
    .string({ error: "Description is required." })
    .trim()
    .min(20, "Please describe the issue in at least 20 characters so we can help faster.")
    .max(
      TICKET_LIMITS.DESCRIPTION_MAX,
      `Description cannot exceed ${TICKET_LIMITS.DESCRIPTION_MAX} characters.`,
    ),
});

export const listTicketsQuerySchema = z
  .object({
    status: csvEnum(TICKET_STATUSES, "status").optional(),
    category: csvEnum(TICKET_CATEGORIES, "category").optional(),
    priority: csvEnum(TICKET_PRIORITIES, "priority").optional(),
    assignee: z
      .string()
      .refine(
        (value) => value === "me" || value === "unassigned" || isValidObjectId(value),
        'assignee must be "me", "unassigned" or a user id.',
      )
      .optional(),
    authorId: objectIdSchema("author id").optional(),
    from: z.coerce.date({ error: "from must be a valid date." }).optional(),
    to: z.coerce.date({ error: "to must be a valid date." }).optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(["urgency", "newest", "oldest", "recent_activity"]).default("urgency"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "from must be before to.",
    path: ["from"],
  });

export const addMessageSchema = z.object({
  body: z
    .string({ error: "Message is required." })
    .trim()
    .min(1, "Message cannot be empty.")
    .max(
      TICKET_LIMITS.MESSAGE_MAX,
      `Message cannot exceed ${TICKET_LIMITS.MESSAGE_MAX} characters.`,
    ),
  /** Admin only: status to set together with the reply (e.g. reply + resolve). */
  status: z.preprocess(emptyToUndefined, z.enum(TICKET_STATUSES).optional()),
  /** Admin only: the reply started from the AI draft. */
  aiAssisted: formBoolean.default(false),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    /** Admin user id, or null to unassign. */
    assigneeId: objectIdSchema("assignee id").nullable().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "Provide at least one of: status, category, priority, assigneeId.",
  });

export const addNoteSchema = z.object({
  body: z
    .string({ error: "Note is required." })
    .trim()
    .min(1, "Note cannot be empty.")
    .max(TICKET_LIMITS.NOTE_MAX, `Note cannot exceed ${TICKET_LIMITS.NOTE_MAX} characters.`),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type AddMessageInput = z.infer<typeof addMessageSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AddNoteInput = z.infer<typeof addNoteSchema>;
