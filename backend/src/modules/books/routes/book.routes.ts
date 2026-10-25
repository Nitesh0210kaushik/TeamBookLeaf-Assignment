import { Router } from "express";
import { requireAuth } from "../../../middlewares/auth";
import { validateRequest } from "../../../middlewares/validateRequest";
import { getBook, listBooks } from "../controllers/book.controller";
import { bookParamsSchema, listBooksQuerySchema } from "../validations/book.validation";

export const bookRoutes = Router();

bookRoutes.use(requireAuth);
bookRoutes.get("/", validateRequest({ query: listBooksQuerySchema }), listBooks);
bookRoutes.get("/:bookId", validateRequest({ params: bookParamsSchema }), getBook);
