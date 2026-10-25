import type { BookFacts, RoyaltyFacts } from "../types/ai.types";

const inr = new Intl.NumberFormat("en-IN");

export function formatInr(amount: number | null) {
  return amount === null ? "not set" : `₹${inr.format(amount)}`;
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
  const lines = [`"${book.title}" (${book.bookCode}) — status: ${book.status}`];

  if (book.isPublished) {
    lines.push(
      `published ${book.publicationDate ?? "date unknown"}; ISBN ${book.isbn ?? "not assigned"}; MRP ${formatInr(book.mrp)}`,
      `${book.totalCopiesSold} copies sold; royalty earned ${formatInr(book.totalRoyaltyEarned)}, paid ${formatInr(book.royaltyPaid)}, pending ${formatInr(book.royaltyPending)}; last payout ${book.lastRoyaltyPayoutDate ?? "never"}`,
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
    `last payout: ${royalty.lastPayoutDate ?? "no payout made yet"}`,
    `next payout run: earnings for ${royalty.nextPayoutQuarter}, paid by ${royalty.nextPayoutBy}`,
    royalty.payoutNeedsReview
      ? "payout needs review: YES — pending is above the threshold and no payout has been made for over a full quarterly cycle"
      : "payout needs review: no",
  ].join("; ");
}
