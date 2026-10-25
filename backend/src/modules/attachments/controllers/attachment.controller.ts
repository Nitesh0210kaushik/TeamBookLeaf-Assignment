import type { NextFunction, Request, Response } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { attachmentService } from "../services/attachment.service";

/** Always served as a download (never rendered inline), with the type detected at upload time. */
export const downloadAttachment = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const file = await attachmentService.getDownload(
      req.user!,
      req.params.ticketId,
      req.params.fileId,
    );

    res.attachment(file.fileName);
    res.set({
      "Content-Type": file.mimeType,
      "Content-Length": String(file.size),
      "Cache-Control": "private, no-store",
    });

    file.stream.once("error", (error) => (res.headersSent ? res.destroy(error) : next(error)));
    file.stream.pipe(res);
  },
);
