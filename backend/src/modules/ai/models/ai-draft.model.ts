import { Schema, model, type InferSchemaType, type Types } from "mongoose";

/**
 * Cached reply drafts. A draft is reused until the conversation changes
 * (`basedOnMessageCount`), so re-opening a ticket never triggers a new paid AI call.
 */
const aiDraftSchema = new Schema(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    content: { type: String, required: true },
    source: { type: String, enum: ["ai", "template"], required: true },
    model: { type: String, default: null },
    category: { type: String, required: true },
    knowledgeSections: { type: [String], default: [] },
    basedOnMessageCount: { type: Number, required: true },
    fallbackReason: { type: String, default: null },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

aiDraftSchema.index({ ticket: 1, createdAt: -1 });

export type AiDraftRecord = InferSchemaType<typeof aiDraftSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
};
export const AiDraftModel = model("AiDraft", aiDraftSchema);
