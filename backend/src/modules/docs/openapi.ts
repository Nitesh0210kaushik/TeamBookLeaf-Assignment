import { env } from "../../config/env";
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from "../../constants/ticket";

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const ok = (description: string, data: object) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data,
        },
      },
    },
  },
});
const errors = (...codes: number[]) =>
  Object.fromEntries(codes.map((code) => [code, { $ref: `#/components/responses/E${code}` }]));
const ticketIdParam = { name: "ticketId", in: "path", required: true, schema: { type: "string" } };
const json = (schema: object) => ({ required: true, content: { "application/json": { schema } } });

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "BookLeaf Author Support API",
    version: "1.0.0",
    description: [
      "REST API behind the BookLeaf author portal and admin (ops) portal.",
      "",
      "**Auth:** `POST /auth/login` sets an httpOnly session cookie and also returns `accessToken` for",
      "API clients — send it as `Authorization: Bearer <token>`. Every route except login/health/docs requires auth.",
      "",
      "**Roles:** `author` sees only their own books and tickets (other ids return 404); `admin` sees everything.",
      "",
      "**Errors:** `{ success: false, error: { code, message, details? } }` — `details` maps field → messages.",
    ].join("\n"),
  },
  servers: [{ url: env.API_PREFIX }],
  tags: [
    { name: "Auth" },
    { name: "Authors" },
    { name: "Books" },
    { name: "Tickets" },
    { name: "Tickets · Admin" },
    { name: "Tickets · AI" },
    { name: "Admin" },
    { name: "Realtime" },
    { name: "System" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      cookieAuth: { type: "apiKey", in: "cookie", name: env.AUTH_COOKIE_NAME },
    },
    responses: {
      E400: {
        description: "Validation error (`VALIDATION_ERROR`)",
        content: { "application/json": { schema: ref("Error") } },
      },
      E401: {
        description: "Missing/invalid session (`UNAUTHENTICATED`, `INVALID_CREDENTIALS`)",
        content: { "application/json": { schema: ref("Error") } },
      },
      E403: {
        description: "Role not allowed (`FORBIDDEN`)",
        content: { "application/json": { schema: ref("Error") } },
      },
      E404: {
        description: "Not found, or not yours (`NOT_FOUND`)",
        content: { "application/json": { schema: ref("Error") } },
      },
      E409: {
        description: "State conflict (`CONFLICT`)",
        content: { "application/json": { schema: ref("Error") } },
      },
      E429: {
        description: "Rate limited (`RATE_LIMITED`)",
        content: { "application/json": { schema: ref("Error") } },
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Subject must be at least 5 characters." },
              details: {
                type: "object",
                additionalProperties: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["author", "admin"] },
          authorId: { type: "string", nullable: true },
        },
      },
      Book: {
        type: "object",
        properties: {
          id: { type: "string" },
          bookCode: { type: "string", example: "BK001" },
          title: { type: "string" },
          isbn: { type: "string", nullable: true },
          genre: { type: "string", nullable: true },
          publicationDate: { type: "string", format: "date", nullable: true },
          status: { type: "string", example: "Published & Live" },
          production: {
            type: "object",
            properties: {
              isPublished: { type: "boolean" },
              stage: { type: "string" },
              stageIndex: { type: "integer", nullable: true },
              totalStages: { type: "integer" },
            },
          },
          mrp: { type: "number", nullable: true },
          totalCopiesSold: { type: "integer" },
          totalRoyaltyEarned: { type: "number" },
          royaltyPaid: { type: "number" },
          royaltyPending: { type: "number" },
          lastRoyaltyPayoutDate: { type: "string", format: "date", nullable: true },
          printPartner: { type: "string", nullable: true },
          availableOn: { type: "array", items: { type: "string" } },
        },
      },
      RoyaltySummary: {
        type: "object",
        properties: {
          totalRoyaltyEarned: { type: "number" },
          totalRoyaltyPaid: { type: "number" },
          totalRoyaltyPending: { type: "number" },
          meetsPayoutThreshold: { type: "boolean" },
          payoutNeedsReview: { type: "boolean" },
          schedule: {
            type: "object",
            properties: {
              currentQuarter: { type: "string" },
              nextPayoutQuarter: { type: "string", example: "Q3 2026 (Jul–Sep)" },
              nextPayoutBy: { type: "string", format: "date" },
            },
          },
        },
      },
      TicketSummary: {
        type: "object",
        description:
          "Admins receive the full summary; authors receive a reduced view without priority, AI or assignment data.",
        properties: {
          id: { type: "string" },
          ticketNumber: { type: "integer", example: 1004 },
          subject: { type: "string" },
          status: { type: "string", enum: TICKET_STATUSES },
          category: { type: "string", enum: TICKET_CATEGORIES, nullable: true },
          categorySource: { type: "string", enum: ["ai", "rules", "admin"], nullable: true },
          priority: { type: "string", enum: TICKET_PRIORITIES },
          triageStatus: { type: "string", enum: ["pending", "completed", "fallback"] },
          slaBreached: { type: "boolean" },
          awaitingSupport: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AiDraft: {
        type: "object",
        properties: {
          content: { type: "string" },
          source: {
            type: "string",
            enum: ["ai", "template"],
            description: "`template` = AI unavailable, policy-based fallback",
          },
          model: { type: "string", nullable: true },
          knowledgeSections: { type: "array", items: { type: "string" } },
          fallbackReason: { type: "string", nullable: true, example: "disabled" },
          cached: { type: "boolean" },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in with email and password",
        security: [],
        requestBody: json({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "priya.sharma@email.com" },
            password: { type: "string", example: "Author@123" },
          },
        }),
        responses: {
          200: ok("Session cookie set", {
            type: "object",
            properties: { user: ref("User"), accessToken: { type: "string" } },
          }),
          ...errors(400, 401, 429),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Clear the session cookie",
        security: [],
        responses: { 200: ok("Logged out", { nullable: true }) },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        responses: {
          200: ok("Current user", { type: "object", properties: { user: ref("User") } }),
          ...errors(401),
        },
      },
    },
    "/authors/me": {
      get: {
        tags: ["Authors"],
        summary: "Author: profile, book counts, royalty summary and next payout date",
        responses: {
          200: ok("Account", {
            type: "object",
            properties: { royaltySummary: ref("RoyaltySummary") },
          }),
          ...errors(401, 403),
        },
      },
    },
    "/authors": {
      get: {
        tags: ["Authors"],
        summary: "Admin: list authors",
        responses: { 200: ok("Authors", { type: "object" }), ...errors(401, 403) },
      },
    },
    "/authors/{authorId}": {
      get: {
        tags: ["Authors"],
        summary: "Admin: an author's account summary",
        parameters: [{ name: "authorId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: ok("Account", { type: "object" }), ...errors(400, 401, 403, 404) },
      },
    },
    "/books": {
      get: {
        tags: ["Books"],
        summary: "Author: own books. Admin: all books (optional authorId filter)",
        parameters: [{ name: "authorId", in: "query", schema: { type: "string" } }],
        responses: {
          200: ok("Books", {
            type: "object",
            properties: { books: { type: "array", items: ref("Book") } },
          }),
          ...errors(400, 401),
        },
      },
    },
    "/books/{bookId}": {
      get: {
        tags: ["Books"],
        summary: "Get one book",
        parameters: [{ name: "bookId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: ok("Book", { type: "object", properties: { book: ref("Book") } }),
          ...errors(400, 401, 404),
        },
      },
    },
    "/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "List tickets — authors get their own; admins get the filterable queue",
        description: "Default admin sort `urgency` = unresolved first, then priority, then oldest.",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string" },
            description: "Comma-separated, e.g. `open,in_progress`",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Admin. Comma-separated categories",
          },
          {
            name: "priority",
            in: "query",
            schema: { type: "string" },
            description: "Admin. Comma-separated priorities",
          },
          {
            name: "assignee",
            in: "query",
            schema: { type: "string" },
            description: "Admin. `me`, `unassigned` or a user id",
          },
          { name: "authorId", in: "query", schema: { type: "string" } },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Search subject/description or `#1004`",
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["urgency", "newest", "oldest", "recent_activity"] },
          },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          200: ok("Tickets", {
            type: "object",
            properties: {
              tickets: { type: "array", items: ref("TicketSummary") },
              pagination: { type: "object" },
            },
          }),
          ...errors(400, 401),
        },
      },
      post: {
        tags: ["Tickets"],
        summary: "Author: submit a support query (AI triage runs in the background)",
        requestBody: json({
          type: "object",
          required: ["subject", "description"],
          properties: {
            bookId: {
              type: "string",
              nullable: true,
              description: "Omit or null for General / Account Level",
            },
            subject: { type: "string", minLength: 5, maxLength: 150 },
            description: { type: "string", minLength: 20, maxLength: 5000 },
            attachments: {
              type: "array",
              maxItems: 3,
              items: {
                type: "object",
                properties: {
                  fileName: { type: "string" },
                  fileSize: { type: "integer" },
                  mimeType: { type: "string" },
                },
              },
            },
          },
        }),
        responses: { 201: ok("Created", { type: "object" }), ...errors(400, 401, 403) },
      },
    },
    "/tickets/{ticketId}": {
      get: {
        tags: ["Tickets"],
        summary:
          "Ticket detail — admins also get triage data, internal notes and the audit timeline",
        parameters: [ticketIdParam],
        responses: { 200: ok("Ticket", { type: "object" }), ...errors(400, 401, 404) },
      },
      patch: {
        tags: ["Tickets · Admin"],
        summary: "Admin: update status, override category/priority, (un)assign",
        parameters: [ticketIdParam],
        requestBody: json({
          type: "object",
          properties: {
            status: { type: "string", enum: TICKET_STATUSES },
            category: { type: "string", enum: TICKET_CATEGORIES },
            priority: { type: "string", enum: TICKET_PRIORITIES },
            assigneeId: { type: "string", nullable: true },
          },
        }),
        responses: { 200: ok("Updated", { type: "object" }), ...errors(400, 401, 403, 404) },
      },
    },
    "/tickets/{ticketId}/messages": {
      post: {
        tags: ["Tickets"],
        summary: "Reply on a ticket — author follow-up, or admin response visible to the author",
        description:
          "Admin replies move `open` tickets to `in_progress` unless `status` is given, and auto-assign unassigned tickets. Author replies reopen `resolved` tickets; `closed` tickets return 409.",
        parameters: [ticketIdParam],
        requestBody: json({
          type: "object",
          required: ["body"],
          properties: {
            body: { type: "string", maxLength: 5000 },
            status: { type: "string", enum: TICKET_STATUSES, description: "Admin only" },
            aiAssisted: {
              type: "boolean",
              description: "Admin only: reply started from the AI draft",
            },
          },
        }),
        responses: { 201: ok("Sent", { type: "object" }), ...errors(400, 401, 404, 409) },
      },
    },
    "/tickets/{ticketId}/notes": {
      post: {
        tags: ["Tickets · Admin"],
        summary: "Admin: add an internal note (never visible to authors)",
        parameters: [ticketIdParam],
        requestBody: json({
          type: "object",
          required: ["body"],
          properties: { body: { type: "string", maxLength: 2000 } },
        }),
        responses: { 201: ok("Added", { type: "object" }), ...errors(400, 401, 403, 404) },
      },
    },
    "/tickets/{ticketId}/ai-draft": {
      get: {
        tags: ["Tickets · AI"],
        summary: "Admin: AI-drafted reply (cached until the conversation changes)",
        description:
          "Never fails because of the AI: when the provider is unavailable a policy-based template is returned with `source: template`.",
        parameters: [ticketIdParam],
        responses: {
          200: ok("Draft", {
            type: "object",
            properties: { draft: ref("AiDraft"), ai: { type: "object" } },
          }),
          ...errors(401, 403, 404),
        },
      },
      post: {
        tags: ["Tickets · AI"],
        summary: "Admin: regenerate the draft (rate-limited)",
        parameters: [ticketIdParam],
        responses: {
          201: ok("Draft", { type: "object", properties: { draft: ref("AiDraft") } }),
          ...errors(401, 403, 404, 429),
        },
      },
    },
    "/tickets/{ticketId}/ai-triage": {
      post: {
        tags: ["Tickets · AI"],
        summary: "Admin: re-run AI classification (manual overrides are preserved)",
        parameters: [ticketIdParam],
        responses: { 200: ok("Ticket", { type: "object" }), ...errors(401, 403, 404, 429) },
      },
    },
    "/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "Queue health, AI agreement rate, token usage and estimated cost",
        responses: { 200: ok("Stats", { type: "object" }), ...errors(401, 403) },
      },
    },
    "/admin/team": {
      get: {
        tags: ["Admin"],
        summary: "Admin users (for assignment)",
        responses: { 200: ok("Team", { type: "object" }), ...errors(401, 403) },
      },
    },
    "/realtime/stream": {
      get: {
        tags: ["Realtime"],
        summary: "Server-Sent Events stream of `ticket.updated` events",
        description:
          "Events carry only `{ ticketId, reason }`; clients refetch through the REST API. Authors receive events for their own tickets only.",
        responses: { 200: { description: "text/event-stream" }, ...errors(401) },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Liveness + database + AI availability",
        security: [],
        responses: { 200: ok("Healthy", { type: "object" }) },
      },
    },
  },
};
