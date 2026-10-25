import type { BookFacts, RoyaltyFacts } from "../types/ai.types";

const inr = new Intl.NumberFormat("en-IN");

export function formatInr(amount: number | null) {
  return amount === null ? "not set" : `₹${inr.format(amount)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-11-14" → "14 Nov 2026". Facts are given to the model (and templates) in the format
 * an author should read, because the model is told to quote dates exactly as given.
 */
export function formatDate(isoDate: string | null, fallback = "unknown") {
  if (!isoDate) return fallback;
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** Truncates long author text so a single verbose ticket can't blow up token usage. */
export function truncate(text: string, maxChars: number) {
  const clean = text.trim();
  return clean.length <= maxChars ? clean : `${clean.slice(0, maxChars)}… [truncated]`;
}

/** Neutralises tags so author-written text cannot close our XML-style prompt sections. */
export function escapeTags(text: string) {
  return text.replace(/</g, "‹").replace(/>/g, "›");
}

export function formatBookFacts(book: BookFacts) {
  // Internal ids (e.g. BK014) are left out so they never leak into author-facing replies.
  const lines = [`"${book.title}" — status: ${book.status}`];

  if (book.isPublished) {
    lines.push(
      `published ${formatDate(book.publicationDate, "date unknown")}; ISBN ${book.isbn ?? "not assigned"}; MRP ${formatInr(book.mrp)}`,
      `${book.totalCopiesSold} copies sold; royalty earned ${formatInr(book.totalRoyaltyEarned)}, paid ${formatInr(book.royaltyPaid)}, pending ${formatInr(book.royaltyPending)}; last payout ${formatDate(book.lastRoyaltyPayoutDate, "never")}`,
      `printed by ${book.printPartner ?? "not set"}; available on ${book.availableOn.length ? book.availableOn.join(", ") : "no platforms yet"}`,
    );
  } else {
    lines.push(
      `still in production (not yet published, no sales or royalties yet); ISBN ${book.isbn ?? "not assigned"}`,
    );
  }

  return lines.join("; ");
}

export function formatRoyaltyFacts(royalty: RoyaltyFacts) {
  return [
    `total pending royalty across all books: ${formatInr(royalty.totalRoyaltyPending)}`,
    `payout threshold ${formatInr(royalty.payoutThresholdInr)} — ${royalty.meetsPayoutThreshold ? "met" : "not met (pending amount rolls over to the next quarter)"}`,
    `last payout: ${formatDate(royalty.lastPayoutDate, "no payout made yet")}`,
    `next payout run: earnings for ${royalty.nextPayoutQuarter}, paid by ${formatDate(royalty.nextPayoutBy)}`,
    royalty.payoutNeedsReview
      ? "payout needs review: YES — pending is above the threshold and no payout has been made for over a full quarterly cycle"
      : "payout needs review: no",
  ].join("; ");
}
