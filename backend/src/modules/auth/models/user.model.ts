import { Schema, model, type InferSchemaType, type Types } from "mongoose";
import { USER_ROLES } from "../../../constants/roles";

/**
 * Login identity. Author business data (books, royalties) lives on the Author profile;
 * a user with role "author" links to exactly one Author, admins link to none.
 */
const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: USER_ROLES, required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "Author", default: null },
  },
  { timestamps: true },
);

export type UserRecord = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const UserModel = model("User", userSchema);
