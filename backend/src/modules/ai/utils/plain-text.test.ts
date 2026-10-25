import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toPlainText } from "./plain-text";

describe("toPlainText", () => {
  it("removes bold and italic markers but keeps the words", () => {
    assert.equal(
      toPlainText("Royalties for *Between Two Temples* are **₹2,546** pending."),
      "Royalties for Between Two Temples are ₹2,546 pending.",
    );
  });

  it("removes headings and normalises bullets", () => {
    assert.equal(
      toPlainText("## Next steps\n- Share photos\n* We reprint"),
      "Next steps\n• Share photos\n• We reprint",
    );
  });

  it("leaves ordinary text, numbered lists and maths alone", () => {
    const text = "1. Reply here.\n2. We reprint in 5–7 business days.\n6+ months, 2 * 3 = 6";
    assert.equal(toPlainText(text), text);
  });
});
