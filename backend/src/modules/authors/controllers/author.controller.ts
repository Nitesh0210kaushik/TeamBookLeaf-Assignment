import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { authorService } from "../services/author.service";

export const getMyAccount = catchAsync(async (req: Request, res: Response) => {
  const account = await authorService.getAccount(req.user!.authorId!);
  res.status(HTTP_STATUS.OK).json(apiResponse("Author account loaded.", account));
});

export const listAuthors = catchAsync(async (_req: Request, res: Response) => {
  const authors = await authorService.listAuthors();
  res.status(HTTP_STATUS.OK).json(apiResponse("Authors loaded.", { authors }));
});

export const getAuthorAccount = catchAsync(async (req: Request, res: Response) => {
  const account = await authorService.getAccount(req.params.authorId);
  res.status(HTTP_STATUS.OK).json(apiResponse("Author account loaded.", account));
});
