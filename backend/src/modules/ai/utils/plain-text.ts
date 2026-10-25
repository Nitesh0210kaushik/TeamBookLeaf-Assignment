/**
 * Replies are shown to authors as plain text, so any markdown a model slips in
 * (`**bold**`, `*italic*`, `# heading`) would appear as stray symbols. This removes it
 * while keeping the words, line breaks and numbered lists intact.
 */
export function toPlainText(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[\s(“"])\*(?!\s)([^*\n]+?)\*(?=[\s).,;:!?”"]|$)/gm, "$1$2")
    .replace(/(^|[\s(“"])_(?!\s)([^_\n]+?)_(?=[\s).,;:!?”"]|$)/gm, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}
