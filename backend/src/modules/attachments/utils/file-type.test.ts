import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFileType, sanitizeFileName } from "./file-type";

const bytes = (...values: number[]) => Buffer.from(values);

describe("detectFileType", () => {
  it("recognises allowed formats from their content", () => {
    assert.equal(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0), "a.jpg")?.mimeType, "image/jpeg");
    assert.equal(
      detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "a.png")?.mimeType,
      "image/png",
    );
    assert.equal(detectFileType(Buffer.from("RIFF0000WEBPVP8 "), "a.webp")?.mimeType, "image/webp");
    assert.equal(
      detectFileType(Buffer.from("%PDF-1.7"), "statement.pdf")?.mimeType,
      "application/pdf",
    );
    assert.equal(
      detectFileType(Buffer.from("date,amount\n2026-01-01,100"), "sales.csv")?.extension,
      "csv",
    );
  });

  it("uses the extension only to tell ZIP-based Office files apart", () => {
    const zip = bytes(0x50, 0x4b, 0x03, 0x04, 0x14);
    assert.equal(detectFileType(zip, "royalties.xlsx")?.extension, "xlsx");
    assert.equal(detectFileType(zip, "letter.docx")?.extension, "docx");
    assert.equal(detectFileType(zip, "archive.zip"), null);
  });

  it("rejects a disguised file regardless of its name", () => {
    assert.equal(detectFileType(bytes(0x4d, 0x5a, 0x90, 0x00), "photo.jpg"), null); // Windows executable
    assert.equal(detectFileType(Buffer.from("<svg onload=alert(1)>"), "image.png"), null);
    assert.equal(detectFileType(bytes(0x00, 0x01, 0x02), "data.csv"), null);
  });
});

describe("sanitizeFileName", () => {
  it("strips paths and unsafe characters", () => {
    assert.equal(sanitizeFileName("../../etc/pass:wd.pdf", "pdf"), "passwd.pdf");
    assert.equal(sanitizeFileName('C:\\Users\\me\\"quote".png', "png"), "quote.png");
  });

  it("falls back to a generic name when nothing is left", () => {
    assert.equal(sanitizeFileName("<>|", "jpg"), "attachment.jpg");
  });
});
