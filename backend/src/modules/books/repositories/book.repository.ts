import type { Types } from "mongoose";
import { BookModel, type BookRecord } from "../models/book.model";

export class BookRepository {
  async findById(bookId: string | Types.ObjectId) {
    return BookModel.findById(bookId).lean<BookRecord>();
  }

  async findByAuthor(authorId: string | Types.ObjectId) {
    // Published books first (newest first), in-production books (no publication date) last.
    return BookModel.find({ author: authorId })
      .sort({ publicationDate: -1, title: 1 })
      .lean<BookRecord[]>();
  }

  async findByIds(bookIds: Types.ObjectId[]) {
    return BookModel.find({ _id: { $in: bookIds } }).lean<BookRecord[]>();
  }

  async findAll(filter: { authorId?: string } = {}) {
    return BookModel.find(filter.authorId ? { author: filter.authorId } : {})
      .sort({ title: 1 })
      .lean<BookRecord[]>();
  }
}

export const bookRepository = new BookRepository();
