import type { AuthUser } from "../../../middlewares/auth";
import { ApiError } from "../../../utils/ApiError";
import { toBookDto } from "../dtos/book.dto";
import { bookRepository } from "../repositories/book.repository";

export class BookService {
  /** Authors only ever get their own books; admins can see all or filter by author. */
  async listBooks(user: AuthUser, filter: { authorId?: string }) {
    const books =
      user.role === "author"
        ? await bookRepository.findByAuthor(user.authorId!)
        : await bookRepository.findAll(filter);

    return books.map(toBookDto);
  }

  async getBook(user: AuthUser, bookId: string) {
    const book = await bookRepository.findById(bookId);

    // 404 (not 403) for other authors' books, so ids cannot be probed for existence.
    if (!book || (user.role === "author" && String(book.author) !== user.authorId)) {
      throw ApiError.notFound("Book not found.");
    }

    return toBookDto(book);
  }
}

export const bookService = new BookService();
