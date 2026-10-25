import type { TicketCategory, TicketPriority } from "../../../constants/ticket";

export type AiOperation = "triage" | "draft";

/** Why an AI result was not produced — surfaced to admins and stored for analysis. */
export type AiFailureReason =
  | "disabled"
  | "circuit_open"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "auth_error"
  | "refusal"
  | "invalid_output";

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type AiCallResult<T> =
  | { ok: true; value: T; model: string; usage: AiUsage }
  | { ok: false; reason: AiFailureReason; message: string };

/** Compact, already-computed facts about the book a ticket refers to. */
export type BookFacts = {
  bookCode: string;
  title: string;
  isbn: string | null;
  status: string;
  isPublished: boolean;
  publicationDate: string | null;
  mrp: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
};

export type RoyaltyFacts = {
  totalRoyaltyPending: number;
  meetsPayoutThreshold: boolean;
  payoutThresholdInr: number;
  lastPayoutDate: string | null;
  payoutNeedsReview: boolean;
  nextPayoutQuarter: string;
  nextPayoutBy: string;
};

export type TriageInput = {
  subject: string;
  description: string;
  book: BookFacts | null;
  royalty: RoyaltyFacts;
};

export type TriageResult = {
  category: TicketCategory;
  priority: TicketPriority;
  confidence: number;
  reasoning: string;
  source: "ai" | "rules";
  model: string | null;
  fallbackReason: AiFailureReason | null;
};

export type ConversationMessage = {
  role: "author" | "admin";
  body: string;
  createdAt: string;
};

export type DraftInput = {
  ticketNumber: number;
  subject: string;
  category: TicketCategory;
  status: string;
  author: { name: string; firstName: string; joinedDate: string | null };
  book: BookFacts | null;
  /** Short list of the author's other books, used for general/account-level tickets. */
  otherBooks: Array<{ title: string; status: string }>;
  royalty: RoyaltyFacts;
  /** Oldest first; the original ticket description is the first author message. */
  conversation: ConversationMessage[];
  today: string;
};

export type DraftResult = {
  content: string;
  source: "ai" | "template";
  model: string | null;
  knowledgeSections: string[];
  fallbackReason: AiFailureReason | null;
  usage: AiUsage | null;
};
