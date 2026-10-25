import { Schema, model, type InferSchemaType, type Types } from "mongoose";
import {
  CLASSIFICATION_SOURCES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TRIAGE_STATUSES,
} from "../../../constants/ticket";
import { attachmentSchema } from "./attachment.schema";

/**
 * The AI's own suggestion is kept even after an admin overrides it — comparing it with the
 * final values gives a free classification-accuracy metric.
 */
const triageSchema = new Schema(
  {
    status: { type: String, enum: TRIAGE_STATUSES, default: "pending" },
    suggestedCategory: { type: String, enum: [...TICKET_CATEGORIES, null], default: null },
    suggestedPriority: { type: String, enum: [...TICKET_PRIORITIES, null], default: null },
    confidence: { type: Number, default: null, min: 0, max: 1 },
    reasoning: { type: String, default: null },
    model: { type: String, default: null },
    /** Why AI was not used (no key, provider error, circuit open) when status is "fallback". */
    fallbackReason: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false },
);

const ticketSchema = new Schema(
  {
    /** Human-friendly sequential number shown in the UI, e.g. #1042. */
    ticketNumber: { type: Number, required: true, unique: true },
    author: { type: Schema.Types.ObjectId, ref: "Author", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** null = "General / Account Level" query. */
    book: { type: Schema.Types.ObjectId, ref: "Book", default: null },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },

    status: { type: String, enum: TICKET_STATUSES, default: "open", index: true },
    /** true while status is open / in_progress — lets the queue sort unresolved tickets first. */
    isOpen: { type: Boolean, default: true },
    /** null until triage finishes (usually a few seconds after creation). */
    category: { type: String, enum: [...TICKET_CATEGORIES, null], default: null },
    categorySource: { type: String, enum: [...CLASSIFICATION_SOURCES, null], default: null },
    priority: { type: String, enum: TICKET_PRIORITIES, default: "medium" },
    prioritySource: { type: String, enum: [...CLASSIFICATION_SOURCES, null], default: null },
    /** Denormalised from priority so the queue can sort by urgency inside MongoDB. */
    priorityRank: { type: Number, default: 2 },
    /** First-response deadline derived from priority (see PRIORITY_SLA_HOURS). */
    slaDueAt: { type: Date, required: true },
    triage: { type: triageSchema, default: () => ({}) },

    assignee: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    messageCount: { type: Number, default: 0 },
    firstResponseAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: Date.now },
    lastAuthorMessageAt: { type: Date, default: Date.now },
    lastAdminReplyAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Default admin queue order: unresolved first, most urgent, then oldest.
ticketSchema.index({ isOpen: -1, priorityRank: -1, createdAt: 1 });
ticketSchema.index({ author: 1, createdAt: -1 });
ticketSchema.index({ category: 1, createdAt: -1 });
ticketSchema.index({ subject: "text", description: "text" });

export type TicketRecord = InferSchemaType<typeof ticketSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};
export const TicketModel = model("Ticket", ticketSchema);
