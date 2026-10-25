import mongoose, { Types } from "mongoose";

const BUCKET_NAME = "attachments";

/**
 * File storage in MongoDB GridFS (the same Atlas cluster), so uploads need no extra service.
 * Files are split into chunks; the `attachments.files` document holds name, size and metadata.
 */
function bucket() {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection is not ready.");
  }
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

export class AttachmentRepository {
  upload(file: { buffer: Buffer; fileName: string; mimeType: string; uploadedBy: string }) {
    return new Promise<Types.ObjectId>((resolve, reject) => {
      const stream = bucket().openUploadStream(file.fileName, {
        metadata: { contentType: file.mimeType, uploadedBy: new Types.ObjectId(file.uploadedBy) },
      });
      stream.once("finish", () => resolve(stream.id as Types.ObjectId));
      stream.once("error", reject);
      stream.end(file.buffer);
    });
  }

  async findById(fileId: string | Types.ObjectId) {
    const [file] = await bucket()
      .find({ _id: new Types.ObjectId(String(fileId)) })
      .limit(1)
      .toArray();
    return file ?? null;
  }

  openDownloadStream(fileId: string | Types.ObjectId) {
    return bucket().openDownloadStream(new Types.ObjectId(String(fileId)));
  }

  async deleteMany(fileIds: Types.ObjectId[]) {
    await Promise.all(
      fileIds.map((fileId) =>
        bucket()
          .delete(fileId)
          .catch(() => undefined),
      ),
    );
  }

  async deleteAll() {
    await bucket()
      .drop()
      .catch(() => undefined);
  }
}

export const attachmentRepository = new AttachmentRepository();
