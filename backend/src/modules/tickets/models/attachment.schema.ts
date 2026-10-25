import { Schema } from "mongoose";

/** Reference to a file stored in GridFS, embedded in tickets and messages. */
export const attachmentSchema = new Schema(
  {
    fileId: { type: Schema.Types.ObjectId, required: true },
    fileName: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    mimeType: { type: String, required: true },
  },
  { _id: false },
);
