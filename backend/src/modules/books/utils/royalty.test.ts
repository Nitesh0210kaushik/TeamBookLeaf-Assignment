import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPayoutSchedule, summarizeRoyalties } from "./royalty";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("getPayoutSchedule", () => {
  it("points to the just-closed quarter while inside its 45-day payout window", () => {
    const schedule = getPayoutSchedule(utc("2026-10-25"));
    assert.equal(schedule.nextPayoutQuarter, "Q3 2026 (Jul–Sep)");
    assert.equal(schedule.nextPayoutBy, "2026-11-14");
    assert.equal(schedule.currentQuarter, "Q4 2026 (Oct–Dec)");
  });

  it("moves to the current quarter once the previous window has passed", () => {
    const schedule = getPayoutSchedule(utc("2026-12-01"));
    assert.equal(schedule.nextPayoutQuarter, "Q4 2026 (Oct–Dec)");
    assert.equal(schedule.nextPayoutBy, "2027-02-14");
  });

  it("handles the year boundary (Q4 payout lands in February)", () => {
    const schedule = getPayoutSchedule(utc("2027-01-10"));
    assert.equal(schedule.nextPayoutQuarter, "Q4 2026 (Oct–Dec)");
    assert.equal(schedule.nextPayoutBy, "2027-02-14");
  });
});

describe("summarizeRoyalties", () => {
  const base = {
    totalCopiesSold: 0,
    totalRoyaltyEarned: 0,
    royaltyPaid: 0,
    royaltyPending: 0,
    lastRoyaltyPayoutDate: null,
    publicationDate: null,
  };

  it("rolls over when pending is below the ₹1,000 threshold", () => {
    const summary = summarizeRoyalties(
      [{ ...base, royaltyPending: 850, publicationDate: utc("2024-11-05") }],
      utc("2026-10-25"),
    );
    assert.equal(summary.meetsPayoutThreshold, false);
    assert.equal(summary.payoutNeedsReview, false);
  });

  it("flags a review when pending is above threshold and nothing was ever paid", () => {
    const summary = summarizeRoyalties(
      [{ ...base, royaltyPending: 2546, publicationDate: utc("2024-07-05") }],
      utc("2026-10-25"),
    );
    assert.equal(summary.meetsPayoutThreshold, true);
    assert.equal(summary.payoutNeedsReview, true);
    assert.equal(summary.lastPayoutDate, null);
  });

  it("handles authors with only in-production books (all zeros, no dates)", () => {
    const summary = summarizeRoyalties([base], utc("2026-10-25"));
    assert.equal(summary.totalRoyaltyEarned, 0);
    assert.equal(summary.daysSinceLastPayout, null);
    assert.equal(summary.payoutNeedsReview, false);
  });

  it("aggregates across books and picks the latest payout date", () => {
    const summary = summarizeRoyalties(
      [
        {
          ...base,
          royaltyPending: 3570,
          totalRoyaltyEarned: 11970,
          lastRoyaltyPayoutDate: utc("2025-10-15"),
        },
        {
          ...base,
          royaltyPending: 0,
          totalRoyaltyEarned: 7938,
          lastRoyaltyPayoutDate: utc("2025-12-01"),
        },
      ],
      utc("2026-01-10"),
    );
    assert.equal(summary.totalRoyaltyPending, 3570);
    assert.equal(summary.totalRoyaltyEarned, 19908);
    assert.equal(summary.lastPayoutDate, "2025-12-01");
    assert.equal(summary.daysSinceLastPayout, 40);
    assert.equal(summary.payoutNeedsReview, false);
  });
});
