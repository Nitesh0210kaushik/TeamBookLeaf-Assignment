import type { TicketCategory, TicketPriority, TicketStatus } from "@/types/api";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  royalty_payments: "Royalty & Payments",
  isbn_metadata: "ISBN & Metadata",
  printing_quality: "Printing & Quality",
  distribution_availability: "Distribution & Availability",
  book_status_production: "Book Status & Production",
  general_inquiry: "General Inquiry",
};

export const STATUSES = Object.keys(STATUS_LABELS) as TicketStatus[];
export const PRIORITIES = Object.keys(PRIORITY_LABELS) as TicketPriority[];
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as TicketCategory[];

export const SOURCE_LABELS = { ai: "AI", rules: "Keywords", admin: "Manual" } as const;

/** Human-readable reasons shown when the AI could not be used. */
export const AI_FALLBACK_REASONS: Record<string, string> = {
  disabled: "AI assist is turned off",
  circuit_open: "AI assist is temporarily paused",
  rate_limited: "AI assist is busy — try again shortly",
  timeout: "AI assist took too long to respond",
  provider_error: "AI assist is temporarily unavailable",
  auth_error: "AI assist is unavailable (configuration issue)",
  refusal: "AI assist couldn't handle this request",
  invalid_output: "AI assist returned an unusable result",
  seed: "Classified from keywords",
};

export const KB_SECTION_LABELS: Record<string, string> = {
  company: "Company overview",
  royalty: "Royalty policy",
  isbn: "ISBN & metadata",
  printing: "Printing & quality",
  distribution: "Distribution",
  production: "Production stages",
};

export const PRODUCTION_STAGES = [
  "Manuscript Received",
  "Editing",
  "Cover Design",
  "Typesetting",
  "Proofreading",
  "ISBN Assignment",
  "Printing",
  "Distribution Setup",
  "Published & Live",
];

export const ATTACHMENT_LIMITS = { maxFiles: 3, maxBytes: 10 * 1024 * 1024 };
