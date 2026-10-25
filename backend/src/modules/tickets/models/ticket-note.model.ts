import { Schema, model, type InferSchemaType, type Types } from "mongoose";

/**
 * Internal notes live in their own collection (not a flag on messages), so no author-facing
 * query can ever return them by accident — the separation is structural, not a filter.
 */
const ticketNoteSchema = new Schema(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type TicketNoteRecord = InferSchemaType<typeof ticketNoteSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
};
export const TicketNoteModel = model("TicketNote", ticketNoteSchema);
