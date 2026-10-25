import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RoyaltyFacts } from "../types/ai.types";
import { applyPolicyGuardrails } from "./policy-guardrails";
import { classifyWithRules } from "./rule-classifier";

const royalty: RoyaltyFacts = {
  totalRoyaltyPending: 0,
  meetsPayoutThreshold: false,
  payoutThresholdInr: 1000,
  lastPayoutDate: null,
  payoutNeedsReview: false,
  nextPayoutQuarter: "Q3 2026 (Jul–Sep)",
  nextPayoutBy: "2026-11-14",
};

const classify = (subject: string, description: string) =>
  classifyWithRules({ subject, description, book: null });

describe("classifyWithRules — brief examples", () => {
  it("6 months without royalty → Royalty, Critical", () => {
    const r = classify("No royalty", "I haven't received any royalty for 6 months.");
    assert.equal(r.category, "royalty_payments");
    assert.equal(r.priority, "critical");
  });

  it("author bio update → General, Low", () => {
    const r = classify("Bio", "Can I update my author bio?");
    assert.equal(r.category, "general_inquiry");
    assert.equal(r.priority, "low");
  });

  it("ISBN mismatch → ISBN, High", () => {
    const r = classify(
      "Wrong ISBN",
      "My book is showing a different ISBN on Amazon than what's on the physical copy.",
    );
    assert.equal(r.category, "isbn_metadata");
    assert.equal(r.priority, "high");
  });

  it("ISBN mismatch on an Amazon listing is still ISBN, not Distribution", () => {
    const r = classify(
      "Different ISBN on Amazon",
      "The Amazon India listing shows a different ISBN from the one printed on my author copies.",
    );
    assert.equal(r.category, "isbn_metadata");
    assert.equal(r.priority, "high");
  });

  it("blurry author copies → Printing, High", () => {
    const r = classify(
      "Print issue",
      "The images are blurry and pages are misaligned in my author copies.",
    );
    assert.equal(r.category, "printing_quality");
    assert.equal(r.priority, "high");
  });

  it("currently unavailable on Amazon → Distribution, High", () => {
    const r = classify(
      "Amazon",
      "My book is published but it's showing as Currently Unavailable on Amazon.",
    );
    assert.equal(r.category, "distribution_availability");
    assert.equal(r.priority, "high");
  });

  it("stuck in typesetting → Production", () => {
    const r = classify(
      "Status",
      "It's been 3 weeks and my book is still in typesetting. When will it be done?",
    );
    assert.equal(r.category, "book_status_production");
  });
});

describe("applyPolicyGuardrails", () => {
  it("raises an ISBN error the model scored Medium to High", () => {
    const r = applyPolicyGuardrails(
      { category: "isbn_metadata", priority: "medium" },
      { subject: "ISBN", description: "There is a duplicate ISBN on my listing", royalty },
    );
    assert.equal(r.priority, "high");
    assert.equal(r.applied.length, 1);
  });

  it("never lowers priority", () => {
    const r = applyPolicyGuardrails(
      { category: "isbn_metadata", priority: "critical" },
      { subject: "ISBN", description: "wrong ISBN", royalty },
    );
    assert.equal(r.priority, "critical");
    assert.equal(r.applied.length, 0);
  });

  it("raises missing royalty when records flag the payout for review", () => {
    const r = applyPolicyGuardrails(
      { category: "royalty_payments", priority: "medium" },
      {
        subject: "Royalty",
        description: "I have not received my royalty yet",
        royalty: { ...royalty, payoutNeedsReview: true, meetsPayoutThreshold: true },
      },
    );
    assert.equal(r.priority, "high");
  });
});
