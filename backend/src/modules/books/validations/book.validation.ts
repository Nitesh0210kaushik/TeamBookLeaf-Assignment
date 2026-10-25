import { isValidObjectId } from "mongoose";
import { z } from "zod";

export const objectIdSchema = (label: string) =>
  z.string().refine((value) => isValidObjectId(value), `Invalid ${label}.`);

export const bookParamsSchema = z.object({
  bookId: objectIdSchema("book id"),
});

export const listBooksQuerySchema = z.object({
  /** Admin-only filter; ignored for authors (they only ever see their own books). */
  authorId: objectIdSchema("author id").optional(),
});
