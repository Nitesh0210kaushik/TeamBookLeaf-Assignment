import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { bookService } from "../services/book.service";

export const listBooks = catchAsync(async (req: Request, res: Response) => {
  const books = await bookService.listBooks(req.user!, req.query as { authorId?: string });
  res.status(HTTP_STATUS.OK).json(apiResponse("Books loaded.", { books }));
});

export const getBook = catchAsync(async (req: Request, res: Response) => {
  const book = await bookService.getBook(req.user!, req.params.bookId);
  res.status(HTTP_STATUS.OK).json(apiResponse("Book loaded.", { book }));
});
