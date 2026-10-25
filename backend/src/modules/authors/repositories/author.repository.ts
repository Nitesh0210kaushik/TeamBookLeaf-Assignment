import type { Types } from "mongoose";
import { AuthorModel, type AuthorRecord } from "../models/author.model";

export class AuthorRepository {
  async findById(authorId: string | Types.ObjectId) {
    return AuthorModel.findById(authorId).lean<AuthorRecord>();
  }

  async findByIds(authorIds: Types.ObjectId[]) {
    return AuthorModel.find({ _id: { $in: authorIds } }).lean<AuthorRecord[]>();
  }

  async findAll() {
    return AuthorModel.find().sort({ name: 1 }).lean<AuthorRecord[]>();
  }
}

export const authorRepository = new AuthorRepository();
