/**
 * BookLeaf royalty policy, encoded in code rather than left to the LLM:
 * - royalties are calculated quarterly and paid within 45 days of the quarter ending;
 * - payouts happen only once accumulated pending royalty reaches ₹1,000, otherwise it rolls over.
 *
 * Both the author dashboard and the AI drafting context use these helpers, so the date an
 * author sees on screen and the date the AI quotes in a reply are always the same.
 */
export const ROYALTY_POLICY = {
  authorSharePercent: 80,
  payoutThresholdInr: 1000,
  payoutWindowDays: 45,
  /** One quarter + the payout window: longer than this without a payout deserves a check. */
  overdueAfterDays: 90 + 45,
} as const;

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Quarter = { year: number; quarter: 1 | 2 | 3 | 4 };

function quarterOf(date: Date): Quarter {
  return {
    year: date.getUTCFullYear(),
    quarter: (Math.floor(date.getUTCMonth() / 3) + 1) as Quarter["quarter"],
  };
}

function previousQuarter({ year, quarter }: Quarter): Quarter {
  return quarter === 1
    ? { year: year - 1, quarter: 4 }
    : { year, quarter: (quarter - 1) as Quarter["quarter"] };
}

function quarterEnd({ year, quarter }: Quarter) {
  // Day 0 of the following month = last day of the quarter.
  return new Date(Date.UTC(year, quarter * 3, 0));
}

function payoutDeadline(q: Quarter) {
  return new Date(quarterEnd(q).getTime() + ROYALTY_POLICY.payoutWindowDays * DAY_MS);
}

export function quarterLabel({ year, quarter }: Quarter) {
  const startMonth = MONTHS[(quarter - 1) * 3];
  const endMonth = MONTHS[(quarter - 1) * 3 + 2];
  return `Q${quarter} ${year} (${startMonth}–${endMonth})`;
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export type PayoutSchedule = {
  /** Quarter currently accruing royalties. */
  currentQuarter: string;
  /** The next payout run the author can expect. */
  nextPayoutQuarter: string;
  /** Latest date (inclusive) by which that payout is made. */
  nextPayoutBy: string;
};

export function getPayoutSchedule(today: Date = new Date()): PayoutSchedule {
  const current = quarterOf(today);
  const previous = previousQuarter(current);
  const previousDeadline = payoutDeadline(previous);

  // Inside the 45-day window after a quarter closes, the upcoming payout is for that closed quarter.
  const payoutQuarter = today.getTime() <= previousDeadline.getTime() ? previous : current;

  return {
    currentQuarter: quarterLabel(current),
    nextPayoutQuarter: quarterLabel(payoutQuarter),
    nextPayoutBy: toIsoDate(payoutDeadline(payoutQuarter)),
  };
}

type RoyaltyBook = {
  totalCopiesSold?: number | null;
  totalRoyaltyEarned?: number | null;
  royaltyPaid?: number | null;
  royaltyPending?: number | null;
  lastRoyaltyPayoutDate?: Date | null;
  publicationDate?: Date | null;
};

export type RoyaltySummary = {
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  totalRoyaltyPaid: number;
  totalRoyaltyPending: number;
  lastPayoutDate: string | null;
  daysSinceLastPayout: number | null;
  meetsPayoutThreshold: boolean;
  /** Pending ≥ threshold and no payout for longer than a full cycle — finance should verify. */
  payoutNeedsReview: boolean;
  payoutThresholdInr: number;
  schedule: PayoutSchedule;
};

export function summarizeRoyalties(books: RoyaltyBook[], today: Date = new Date()): RoyaltySummary {
  const sum = (pick: (book: RoyaltyBook) => number | null | undefined) =>
    books.reduce((total, book) => total + (pick(book) ?? 0), 0);

  const totalRoyaltyPending = sum((b) => b.royaltyPending);
  const payoutDates = books
    .map((b) => b.lastRoyaltyPayoutDate)
    .filter((d): d is Date => Boolean(d));
  const lastPayout = payoutDates.length
    ? new Date(Math.max(...payoutDates.map((d) => d.getTime())))
    : null;

  // With no payout ever, measure from the earliest publication date instead.
  const publicationDates = books.map((b) => b.publicationDate).filter((d): d is Date => Boolean(d));
  const earliestPublication = publicationDates.length
    ? new Date(Math.min(...publicationDates.map((d) => d.getTime())))
    : null;
  const reference = lastPayout ?? earliestPublication;
  const daysSinceReference = reference ? daysBetween(reference, today) : null;
  const meetsPayoutThreshold = totalRoyaltyPending >= ROYALTY_POLICY.payoutThresholdInr;

  return {
    totalCopiesSold: sum((b) => b.totalCopiesSold),
    totalRoyaltyEarned: sum((b) => b.totalRoyaltyEarned),
    totalRoyaltyPaid: sum((b) => b.royaltyPaid),
    totalRoyaltyPending,
    lastPayoutDate: lastPayout ? toIsoDate(lastPayout) : null,
    daysSinceLastPayout: lastPayout ? daysBetween(lastPayout, today) : null,
    meetsPayoutThreshold,
    payoutNeedsReview:
      meetsPayoutThreshold &&
      daysSinceReference !== null &&
      daysSinceReference > ROYALTY_POLICY.overdueAfterDays,
    payoutThresholdInr: ROYALTY_POLICY.payoutThresholdInr,
    schedule: getPayoutSchedule(today),
  };
}
