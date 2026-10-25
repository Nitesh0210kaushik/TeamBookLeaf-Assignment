import { Schema, model, type InferSchemaType, type Types } from "mongoose";

/** One row per AI call attempt — the basis for cost tracking and reliability monitoring. */
const aiUsageLogSchema = new Schema(
  {
    operation: { type: String, enum: ["triage", "draft"], required: true },
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", default: null, index: true },
    model: { type: String, required: true },
    success: { type: Boolean, required: true },
    failureReason: { type: String, default: null },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    cacheReadTokens: { type: Number, default: 0 },
    cacheWriteTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

aiUsageLogSchema.index({ createdAt: -1 });

export type AiUsageLogRecord = InferSchemaType<typeof aiUsageLogSchema> & {
  _id: Types.ObjectId;
  createdAt: Date;
};
export const AiUsageLogModel = model("AiUsageLog", aiUsageLogSchema);
