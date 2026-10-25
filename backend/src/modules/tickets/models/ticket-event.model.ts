import { Schema, model, type InferSchemaType, type Types } from "mongoose";
import { TICKET_EVENT_TYPES } from "../../../constants/ticket";

/** Append-only audit trail: who changed what and when (admin-only timeline). */
const ticketEventSchema = new Schema(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    /** null for system actions (e.g. AI triage). */
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: { type: String, enum: TICKET_EVENT_TYPES, required: true },
    from: { type: String, default: null },
    to: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type TicketEventRecord = InferSchemaType<typeof ticketEventSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
};
export const TicketEventModel = model("TicketEvent", ticketEventSchema);
