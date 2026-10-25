import type { TicketCategory, TicketPriority } from "../../../constants/ticket";
import type { TriageInput } from "../types/ai.types";
import { ISBN_ERROR_PATTERN, higherPriority } from "./rule-classifier";

const PAYMENT_MISSING_PATTERN =
  // Word boundaries matter: "late" must not match "calculated".
  /(haven'?t|have not|never|not yet|didn'?t|did not) (been )?(received|got|paid)|\bno royalt|\bmissing\b|\boverdue\b|\blate\b|\bdelay(ed)?\b|still waiting|where is my|single rupee/i;

/** "6 months", "over a year", "since publication" — the brief's example of a prolonged failure. */
const LONG_WAIT_PATTERN =
  /\b([6-9]|1[0-2]|six|seven|eight|nine|ten|eleven|twelve)\+?\s*months?\b|\b(over|more than|almost) a year\b|\b\d+\s*years?\b|since (my book was |it was )?publish/i;

/**
 * Hard business rules applied on top of any classification (AI or rule-based).
 * They can only raise priority, never lower it — a deterministic safety net for
 * the cases BookLeaf's policy explicitly calls out.
 */
export function applyPolicyGuardrails(
  classification: { category: TicketCategory; priority: TicketPriority },
  input: Pick<TriageInput, "subject" | "description" | "royalty">,
) {
  const text = `${input.subject}\n${input.description}`;
  let priority = classification.priority;
  const applied: string[] = [];

  // KB: "If an author reports an ISBN error (duplicate, wrong book linked), it is treated as a high-priority issue."
  if (classification.category === "isbn_metadata" && ISBN_ERROR_PATTERN.test(text)) {
    const raised = higherPriority(priority, "high");
    if (raised !== priority)
      applied.push("ISBN errors are always at least High priority (BookLeaf policy).");
    priority = raised;
  }

  // Records show money owed for over a full payout cycle and the author says it hasn't arrived.
  if (
    classification.category === "royalty_payments" &&
    input.royalty.payoutNeedsReview &&
    PAYMENT_MISSING_PATTERN.test(text)
  ) {
    const raised = higherPriority(priority, "high");
    if (raised !== priority)
      applied.push("Records show a payout overdue for review — raised to High.");
    priority = raised;
  }

  // Brief: "I haven't received any royalty for 6 months" must outrank routine questions.
  if (
    classification.category === "royalty_payments" &&
    PAYMENT_MISSING_PATTERN.test(text) &&
    LONG_WAIT_PATTERN.test(text)
  ) {
    const raised = higherPriority(priority, "critical");
    if (raised !== priority)
      applied.push("No royalty received for 6+ months — raised to Critical.");
    priority = raised;
  }

  return { priority, applied };
}
