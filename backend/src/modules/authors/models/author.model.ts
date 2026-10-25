import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const authorSchema = new Schema(
  {
    /** Business id from the source dataset, e.g. "AUTH001". */
    authorCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    joinedDate: { type: Date, default: null },
  },
  { timestamps: true },
);

export type AuthorRecord = InferSchemaType<typeof authorSchema> & { _id: Types.ObjectId };
export const AuthorModel = model("Author", authorSchema);
