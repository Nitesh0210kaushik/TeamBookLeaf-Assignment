import {
  PRIORITY_RANK,
  TICKET_CATEGORIES,
  type TicketCategory,
  type TicketPriority,
} from "../../../constants/ticket";
import type { TriageInput } from "../types/ai.types";

/**
 * Deterministic keyword classifier. Used when the AI is unavailable (no key, outage, circuit open)
 * and for seeding demo data. Less accurate than the model, but tickets are never left unclassified.
 */
const CATEGORY_SIGNALS: Record<TicketCategory, RegExp[]> = {
  royalty_payments: [
    /royalt/i,
    /payout/i,
    /payment/i,
    /\bpaid\b/i,
    /\bbank\b/i,
    /earning/i,
    /₹\s?\d|\brs\.?\s?\d|\binr\b/i,
    /statement/i,
  ],
  isbn_metadata: [
    /\bisbn\b/i,
    /metadata/i,
    /imprint/i,
    /\bdescription\b/i,
    /author name/i,
    /\b(wrong|incorrect|misspelt|misspelled) (title|name|price)\b/i,
  ],
  printing_quality: [
    /misprint/i,
    /binding/i,
    /blurr?y/i,
    /misalign/i,
    /colou?r (issue|problem|inconsisten)/i,
    /pages? (are )?(missing|torn|loose|upside)/i,
    /author cop(y|ies)/i,
    /print(ing)? quality/i,
    /defect/i,
    /reprint/i,
  ],
  distribution_availability: [
    /unavailable/i,
    /not (available|listed|showing|visible)/i,
    /out of stock/i,
    /\bamazon\b/i,
    /flipkart/i,
    /\blisting\b/i,
    /bookleaf store/i,
    /can'?t (find|buy)/i,
  ],
  book_status_production: [
    /typesetting/i,
    /cover (design|approval)/i,
    /proof ?read/i,
    /\bediting\b/i,
    /in production/i,
    /manuscript/i,
    /when will (my|the) book/i,
    /status of (my|the) book/i,
    /\blaunch\b/i,
    /still (in|at|waiting)/i,
  ],
  general_inquiry: [
    /\bbio\b/i,
    /\bpackage\b/i,
    /bestseller breakthrough/i,
    /how (do|can) i/i,
    /\bpassword\b/i,
    /\bcontact\b/i,
  ],
};

/**
 * A single unambiguous term outweighs incidental context words — e.g. "Amazon listing shows a
 * different ISBN" is an ISBN problem even though "Amazon" and "listing" also match Distribution.
 */
const STRONG_SIGNALS: Partial<Record<TicketCategory, RegExp>> = {
  royalty_payments: /royalt/i,
  isbn_metadata: /\bisbn\b/i,
  printing_quality: /misprint|blurr?y|binding|print(ing)? quality/i,
  distribution_availability: /unavailable|out of stock/i,
  book_status_production: /typesetting|cover design|proof ?read/i,
};
const STRONG_SIGNAL_WEIGHT = 2;

const CRITICAL_SIGNALS = [
  /\b(6|six|7|seven|8|eight|9|nine|10|ten|11|eleven|12|twelve)\+?\s*months?\b/i,
  /\b(over|more than) a year\b/i,
  /\b(legal|lawyer|advocate|court|police|consumer forum|fraud|scam|cheat(ed|ing)?)\b/i,
  /without (my )?(consent|permission)/i,
  /wrong (bank )?account/i,
  /(social media|twitter|linkedin|review sites?) .*(post|complain|expose)/i,
];

const HIGH_SIGNALS = [
  /(haven'?t|have not|never|not yet|didn'?t|did not) (been )?(received|got|gotten|paid)/i,
  /\bno royalt/i,
  /overdue|late payment|payment (is )?delayed/i,
  /\bisbn\b.*\b(wrong|different|duplicate|incorrect|mismatch|error)\b|\b(wrong|different|duplicate|incorrect|mismatch)\b.*\bisbn\b/i,
  /(currently )?unavailable|out of stock|not (available|listed)/i,
  /misprint|defect|blurr?y|binding|misalign|damaged/i,
  /\b(urgent|asap|immediately|unacceptable)\b/i,
];

const LOW_SIGNALS = [
  /\bbio\b/i,
  /how (do|can) i/i,
  /can i (update|change|add|edit)/i,
  /just (wanted|curious|checking)/i,
  /\b(information|info) (about|on)\b/i,
  /\bpackages?\b/i,
];

export const ISBN_ERROR_PATTERN = HIGH_SIGNALS[3];

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

export function classifyCategory(text: string): { category: TicketCategory; score: number } {
  let best: { category: TicketCategory; score: number } = { category: "general_inquiry", score: 0 };

  // Iterates in TICKET_CATEGORIES order, so ties resolve to the more specific category.
  for (const category of TICKET_CATEGORIES) {
    const strong = STRONG_SIGNALS[category]?.test(text) ? STRONG_SIGNAL_WEIGHT : 0;
    const score = countMatches(text, CATEGORY_SIGNALS[category]) + strong;
    if (score > best.score) {
      best = { category, score };
    }
  }

  return best;
}

export function classifyPriority(text: string): TicketPriority {
  if (countMatches(text, CRITICAL_SIGNALS) > 0) return "critical";
  if (countMatches(text, HIGH_SIGNALS) > 0) return "high";
  if (countMatches(text, LOW_SIGNALS) > 0) return "low";
  return "medium";
}

export function classifyWithRules(input: Pick<TriageInput, "subject" | "description" | "book">) {
  const text = `${input.subject}\n${input.description}`;
  const { category: matched, score } = classifyCategory(text);

  // "Not on Amazon yet" for a book still in production is a production question, not a fault.
  const category =
    matched === "distribution_availability" && input.book && !input.book.isPublished
      ? "book_status_production"
      : matched;

  return {
    category,
    priority: classifyPriority(text),
    confidence: score === 0 ? 0.3 : Math.min(0.85, 0.45 + score * 0.1),
    reasoning:
      score === 0
        ? "No clear topic keywords found — set to General Inquiry for review."
        : "Classified automatically from keywords in the ticket text.",
  };
}

export function higherPriority(a: TicketPriority, b: TicketPriority): TicketPriority {
  return PRIORITY_RANK[a] >= PRIORITY_RANK[b] ? a : b;
}
