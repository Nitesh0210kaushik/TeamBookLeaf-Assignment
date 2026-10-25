import { ApiError } from "../../../utils/ApiError";
import { bookRepository } from "../../books/repositories/book.repository";
import { getProductionInfo } from "../../books/utils/production";
import { summarizeRoyalties } from "../../books/utils/royalty";
import { toAuthorDto, type AuthorAccountDto } from "../dtos/author.dto";
import { authorRepository } from "../repositories/author.repository";

export class AuthorService {
  /** Author profile + royalty summary + next payout date — powers the author dashboard header. */
  async getAccount(authorId: string): Promise<AuthorAccountDto> {
    const [author, books] = await Promise.all([
      authorRepository.findById(authorId),
      bookRepository.findByAuthor(authorId),
    ]);

    if (!author) {
      throw ApiError.notFound("Author not found.");
    }

    const published = books.filter((book) => getProductionInfo(book.status).isPublished).length;

    return {
      author: toAuthorDto(author),
      bookCounts: { total: books.length, published, inProduction: books.length - published },
      royaltySummary: summarizeRoyalties(books),
    };
  }

  async listAuthors() {
    const authors = await authorRepository.findAll();
    return authors.map(toAuthorDto);
  }
}

export const authorService = new AuthorService();
