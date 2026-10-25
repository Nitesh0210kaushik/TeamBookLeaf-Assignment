/** Mirrors the backend DTOs (see the dtos folder of each backend module). */

export type Role = "author" | "admin";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketCategory =
  | "royalty_payments"
  | "isbn_metadata"
  | "printing_quality"
  | "distribution_availability"
  | "book_status_production"
  | "general_inquiry";
export type ClassificationSource = "ai" | "rules" | "admin";

export type ApiSuccess<T> = { success: true; message: string; data: T };
export type ApiErrorBody = {
  success: false;
  error: { code: string; message: string; details?: Record<string, string[]> };
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  authorId: string | null;
};

export type ProductionInfo = {
  isPublished: boolean;
  stage: string;
  stageIndex: number | null;
  totalStages: number;
};

export type Book = {
  id: string;
  bookCode: string;
  authorId: string;
  title: string;
  isbn: string | null;
  genre: string | null;
  publicationDate: string | null;
  status: string;
  production: ProductionInfo;
  mrp: number | null;
  authorRoyaltyPerCopy: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
};

export type RoyaltySummary = {
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  totalRoyaltyPaid: number;
  totalRoyaltyPending: number;
  lastPayoutDate: string | null;
  daysSinceLastPayout: number | null;
  meetsPayoutThreshold: boolean;
  payoutNeedsReview: boolean;
  payoutThresholdInr: number;
  schedule: {
    currentQuarter: string;
    nextPayoutQuarter: string;
    nextPayoutBy: string;
  };
};

export type AuthorAccount = {
  author: {
    id: string;
    authorCode: string;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    joinedDate: string | null;
  };
  bookCounts: { total: number; published: number; inProduction: number };
  royaltySummary: RoyaltySummary;
};

export type Ref = { id: string; name: string } | null;
/** `id` is null for legacy entries stored without a file. */
export type Attachment = {
  id: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
};

// Author views

export type AuthorTicketSummary = {
  id: string;
  ticketNumber: number;
  subject: string;
  status: TicketStatus;
  categoryLabel: string | null;
  book: { id: string; title: string } | null;
  messageCount: number;
  hasSupportReply: boolean;
  createdAt: string;
  lastActivityAt: string | null;
};

export type AuthorMessage = {
  id: string;
  senderRole: Role;
  senderName: string;
  body: string;
  attachments: Attachment[];
  createdAt: string;
};

export type AuthorTicketDetail = AuthorTicketSummary & {
  description: string;
  attachments: Attachment[];
  messages: AuthorMessage[];
};

// Admin views

export type AdminTicketSummary = {
  id: string;
  ticketNumber: number;
  subject: string;
  status: TicketStatus;
  category: TicketCategory | null;
  categoryLabel: string | null;
  categorySource: ClassificationSource | null;
  priority: TicketPriority;
  prioritySource: ClassificationSource | null;
  triageStatus: "pending" | "completed" | "fallback";
  author: { id: string; name: string; email: string } | null;
  book: { id: string; title: string } | null;
  assignee: Ref;
  messageCount: number;
  awaitingSupport: boolean;
  slaDueAt: string;
  slaBreached: boolean;
  createdAt: string;
  lastActivityAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
};

export type TicketEventType =
  | "created"
  | "triaged"
  | "status_changed"
  | "category_changed"
  | "priority_changed"
  | "assigned"
  | "admin_replied"
  | "author_replied"
  | "note_added";

export type AdminTicketDetail = AdminTicketSummary & {
  description: string;
  attachments: Attachment[];
  triage: {
    status: "pending" | "completed" | "fallback";
    suggestedCategory: TicketCategory | null;
    suggestedPriority: TicketPriority | null;
    confidence: number | null;
    reasoning: string | null;
    model: string | null;
    fallbackReason: string | null;
    completedAt: string | null;
  };
  messages: Array<{
    id: string;
    senderRole: Role;
    sender: Ref;
    body: string;
    attachments: Attachment[];
    aiAssisted: boolean;
    createdAt: string;
  }>;
  notes: Array<{ id: string; createdBy: Ref; body: string; createdAt: string }>;
  events: Array<{
    id: string;
    type: TicketEventType;
    actor: Ref;
    from: string | null;
    to: string | null;
    meta: Record<string, unknown> | null;
    createdAt: string;
  }>;
};

export type AiStatus = {
  enabled: boolean;
  available: boolean;
  circuitOpen: boolean;
  circuitOpenUntil: string | null;
  triageModel: string;
  draftModel: string;
};

export type AiDraft = {
  id: string;
  content: string;
  source: "ai" | "template";
  model: string | null;
  category: string;
  knowledgeSections: string[];
  fallbackReason: string | null;
  basedOnMessageCount: number;
  createdAt: string;
  cached: boolean;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminStats = {
  queue: {
    byStatus: Record<string, number>;
    openByPriority: Record<string, number>;
    openByCategory: Record<string, number>;
    slaBreached: number;
    unassigned: number;
    assignedToMe: number;
  };
  ai: {
    status: AiStatus;
    categoryAgreementRate: number | null;
    priorityAgreementRate: number | null;
    triagedByAi: number;
    repliesUsingAiDraft: number;
    totalReplies: number;
    usageWindowDays: number;
    usage: Array<{
      operation: "triage" | "draft";
      model: string;
      calls: number;
      failures: number;
      inputTokens: number;
      outputTokens: number;
      cacheReadTokens: number;
      avgLatencyMs: number;
      estimatedCostUsd: number | null;
    }>;
  };
};

export type TeamMember = { id: string; name: string; email: string };

export type TicketListQuery = {
  status?: string;
  category?: string;
  priority?: string;
  assignee?: string;
  from?: string;
  to?: string;
  q?: string;
  sort?: "urgency" | "newest" | "oldest" | "recent_activity";
  page?: number;
  limit?: number;
};
