import type { Types } from "mongoose";
import type { AuthUser } from "../../../middlewares/auth";
import { ApiError } from "../../../utils/ApiError";
import { ticketMessageRepository } from "../../tickets/repositories/ticket-message.repository";
import { getAccessibleTicket } from "../../tickets/services/ticket-access";
import { attachmentRepository } from "../repositories/attachment.repository";
import { ALLOWED_FILE_TYPES_LABEL, detectFileType, sanitizeFileName } from "../utils/file-type";

type PreparedAttachment = { buffer: Buffer; fileName: string; mimeType: string; fileSize: number };

export type StoredAttachment = {
  fileId: Types.ObjectId;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export class AttachmentService {
  /** Validates every file before anything is written, so one bad file rejects the whole request. */
  prepare(files: Express.Multer.File[] = []): PreparedAttachment[] {
    return files.map((file) => {
      const type = detectFileType(file.buffer, file.originalname);
      if (!type) {
        throw ApiError.badRequest(
          `"${file.originalname}" isn't a supported file. Please attach ${ALLOWED_FILE_TYPES_LABEL}.`,
          { attachments: [`Unsupported file: ${file.originalname}`] },
        );
      }
      return {
        buffer: file.buffer,
        fileName: sanitizeFileName(file.originalname, type.extension),
        mimeType: type.mimeType,
        fileSize: file.size,
      };
    });
  }

  async store(files: PreparedAttachment[], uploadedBy: string): Promise<StoredAttachment[]> {
    const stored: StoredAttachment[] = [];
    try {
      for (const file of files) {
        const fileId = await attachmentRepository.upload({ ...file, uploadedBy });
        stored.push({
          fileId,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
        });
      }
      return stored;
    } catch (error) {
      await this.discard(stored);
      throw error;
    }
  }

  /** Removes files whose ticket or message could not be saved, so no orphans are left behind. */
  async discard(stored: StoredAttachment[]) {
    await attachmentRepository.deleteMany(stored.map((file) => file.fileId));
  }

  /**
   * A file is only served through the ticket it belongs to, after the usual ticket access check —
   * so authors can never reach another author's files, even with a valid file id.
   */
  async getDownload(user: AuthUser, ticketId: string, fileId: string) {
    const ticket = await getAccessibleTicket(user, ticketId);
    const onTicket = (ticket.attachments ?? []).some((file) => String(file.fileId) === fileId);
    const onMessage =
      !onTicket && (await ticketMessageRepository.hasAttachment(ticket._id, fileId));

    const file = onTicket || onMessage ? await attachmentRepository.findById(fileId) : null;
    if (!file) {
      throw ApiError.notFound("Attachment not found.");
    }

    return {
      fileName: file.filename,
      mimeType: String(file.metadata?.contentType ?? "application/octet-stream"),
      size: file.length,
      stream: attachmentRepository.openDownloadStream(file._id),
    };
  }
}

export const attachmentService = new AttachmentService();
