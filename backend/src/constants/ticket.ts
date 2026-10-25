export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Statuses that still need work from the ops team. */
export const UNRESOLVED_STATUSES: TicketStatus[] = ["open", "in_progress"];

export const TICKET_CATEGORIES = [
  "royalty_payments",
  "isbn_metadata",
  "printing_quality",
  "distribution_availability",
  "book_status_production",
  "general_inquiry",
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  royalty_payments: "Royalty & Payments",
  isbn_metadata: "ISBN & Metadata Issues",
  printing_quality: "Printing & Quality",
  distribution_availability: "Distribution & Availability",
  book_status_production: "Book Status & Production Updates",
  general_inquiry: "General Inquiry",
};

export const TICKET_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Numeric rank stored on the ticket so the queue can sort by urgency in the database. */
export const PRIORITY_RANK: Record<TicketPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** First-response targets used to flag tickets that are breaching SLA in the queue. */
export const PRIORITY_SLA_HOURS: Record<TicketPriority, number> = {
  critical: 4,
  high: 24,
  medium: 48,
  low: 72,
};

/** Where a category/priority value came from — lets us measure how often admins override the AI. */
export const CLASSIFICATION_SOURCES = ["ai", "rules", "admin"] as const;
export type ClassificationSource = (typeof CLASSIFICATION_SOURCES)[number];

export const TRIAGE_STATUSES = ["pending", "completed", "fallback"] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];

export const TICKET_EVENT_TYPES = [
  "created",
  "triaged",
  "status_changed",
  "category_changed",
  "priority_changed",
  "assigned",
  "admin_replied",
  "author_replied",
  "note_added",
] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const TICKET_LIMITS = {
  SUBJECT_MAX: 150,
  DESCRIPTION_MAX: 5000,
  MESSAGE_MAX: 5000,
  NOTE_MAX: 2000,
  ATTACHMENTS_MAX: 3,
  ATTACHMENT_MAX_BYTES: 10 * 1024 * 1024,
} as const;
