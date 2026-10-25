import type { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
