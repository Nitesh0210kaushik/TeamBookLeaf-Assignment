/**
 * Identifies an uploaded file from its content, not from the name or the browser-declared
 * MIME type (both are client-controlled). Only formats authors genuinely need are allowed.
 */
export type DetectedFileType = { mimeType: string; extension: string };

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  buffer.length >= offset + bytes.length && bytes.every((byte, i) => buffer[offset + i] === byte);

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

/** Office Open XML files are ZIP containers; the extension decides which one. */
const OFFICE_TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

function looksLikeText(buffer: Buffer) {
  const sample = buffer.subarray(0, 4096);
  return sample.length > 0 && !sample.includes(0);
}

export function detectFileType(buffer: Buffer, fileName: string): DetectedFileType | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return { mimeType: "image/jpeg", extension: "jpg" };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (startsWith(buffer, ascii("RIFF")) && startsWith(buffer, ascii("WEBP"), 8)) {
    return { mimeType: "image/webp", extension: "webp" };
  }
  if (startsWith(buffer, ascii("%PDF-"))) return { mimeType: "application/pdf", extension: "pdf" };

  const extension = extensionOf(fileName);
  if (startsWith(buffer, ZIP_SIGNATURE) && OFFICE_TYPES[extension]) {
    return { mimeType: OFFICE_TYPES[extension], extension };
  }
  if (extension === "csv" && looksLikeText(buffer)) return { mimeType: "text/csv", extension };

  return null;
}

export const ALLOWED_FILE_TYPES_LABEL = "JPG, PNG, WEBP, PDF, DOCX, XLSX or CSV";

const UNSAFE_CHARS = new Set(['"', "<", ">", "|", ":", "*", "?"]);

/** Keeps a readable name but drops paths, control characters and anything risky in headers. */
export function sanitizeFileName(fileName: string, fallbackExtension: string) {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = [...base]
    .filter((char) => char.charCodeAt(0) >= 32 && char !== "\x7f" && !UNSAFE_CHARS.has(char))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  return cleaned || `attachment.${fallbackExtension}`;
}
