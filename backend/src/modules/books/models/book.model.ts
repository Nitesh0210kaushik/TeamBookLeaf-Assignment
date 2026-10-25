import { Schema, model, type InferSchemaType, type Types } from "mongoose";

/**
 * Mirrors the source dataset. Money values are whole rupees (INR).
 * Nullable fields are null for books that are still in production (no MRP, no publication date).
 */
const bookSchema = new Schema(
  {
    /** Business id from the source dataset, e.g. "BK001". */
    bookCode: { type: String, required: true, unique: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "Author", required: true, index: true },
    title: { type: String, required: true, trim: true },
    isbn: { type: String, default: null, trim: true },
    genre: { type: String, default: null, trim: true },
    publicationDate: { type: Date, default: null },
    status: { type: String, required: true, trim: true },
    mrp: { type: Number, default: null, min: 0 },
    authorRoyaltyPerCopy: { type: Number, default: null, min: 0 },
    totalCopiesSold: { type: Number, default: 0, min: 0 },
    totalRoyaltyEarned: { type: Number, default: 0, min: 0 },
    royaltyPaid: { type: Number, default: 0, min: 0 },
    royaltyPending: { type: Number, default: 0, min: 0 },
    lastRoyaltyPayoutDate: { type: Date, default: null },
    printPartner: { type: String, default: null, trim: true },
    availableOn: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type BookRecord = InferSchemaType<typeof bookSchema> & { _id: Types.ObjectId };
export const BookModel = model("Book", bookSchema);
