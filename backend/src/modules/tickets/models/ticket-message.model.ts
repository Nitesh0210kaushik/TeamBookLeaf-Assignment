import { Schema, model, type InferSchemaType, type Types } from "mongoose";
import { USER_ROLES } from "../../../constants/roles";
import { attachmentSchema } from "./attachment.schema";

/** Public conversation on a ticket — everything here is visible to the author. */
const ticketMessageSchema = new Schema(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: USER_ROLES, required: true },
    body: { type: String, required: true, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    /** True when an admin sent a reply that started from an AI draft (for adoption metrics). */
    aiAssisted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ticketMessageSchema.index({ ticket: 1, createdAt: 1 });
ticketMessageSchema.index({ ticket: 1, "attachments.fileId": 1 });

export type TicketMessageRecord = InferSchemaType<typeof ticketMessageSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
};
export const TicketMessageModel = model("TicketMessage", ticketMessageSchema);
