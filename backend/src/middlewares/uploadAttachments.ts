import multer from "multer";
import { TICKET_LIMITS } from "../constants/ticket";

/**
 * Parses `multipart/form-data` requests and keeps the files in memory (at most 3 × 10 MB) until
 * their content has been checked. JSON requests pass through untouched.
 */
export const uploadAttachments = multer({
  storage: multer.memoryStorage(),
  defParamCharset: "utf8",
  limits: {
    files: TICKET_LIMITS.ATTACHMENTS_MAX,
    fileSize: TICKET_LIMITS.ATTACHMENT_MAX_BYTES,
    fields: 10,
    fieldSize: 64 * 1024,
  },
}).array("attachments", TICKET_LIMITS.ATTACHMENTS_MAX);
