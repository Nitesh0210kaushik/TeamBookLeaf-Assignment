import type { NextFunction, Request, Response } from "express";

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/** Express 4 does not forward rejected promises to the error handler — this does. */
export function catchAsync(handler: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}
