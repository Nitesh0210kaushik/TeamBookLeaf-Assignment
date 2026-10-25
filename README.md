# BookLeaf Author Support & Communication Portal

A web application for BookLeaf Publishing's author support:

- an **author portal** where authors see their books and royalties, raise support queries and follow replies live;
- an **admin console** where the operations team works a prioritised queue with **AI classification, AI priority scoring and AI-drafted replies** grounded in the BookLeaf knowledge base.

> **Live demo:** _add the deployed URL here_ · **API docs:** `<demo-url>/api/v1/docs`

## Test credentials

All accounts are created by the seed script from the provided `bookleaf_sample_data.json`.

| Role | Email | Password | What it shows |
| --- | --- | --- | --- |
| Admin | `admin@bookleaf.com` | `Admin@123` | Ops console (second admin: `ops@bookleaf.com`) |
| Author | `priya.sharma@email.com` | `Author@123` | Two published books, pending royalty, resolved ticket |
| Author | `sneha.kulkarni@email.com` | `Author@123` | Three books, one still in production (Cover Design) |
| Author | `kavita.deshmukh@email.com` | `Author@123` | Pending ₹850 — below the ₹1,000 payout threshold |
| Author | `ananya.reddy@email.com` | `Author@123` | Never paid, ₹2,546 pending — flagged for payout review |
| Author | `arjun.malhotra@email.com` | `Author@123` | No tickets yet (empty states) |

Every author in the dataset can log in with their email and `Author@123`. The login page has one-click demo buttons.

---

## Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Running locally](#running-locally)
4. [AI integration](#ai-integration)
5. [Real-time updates](#real-time-updates)
6. [Data model](#data-model)
7. [API reference](#api-reference)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Known limitations and next steps](#known-limitations-and-next-steps)

---

## Features

### Author portal

- **Login** with email and password. Each author sees only their own data, and the API enforces this on every request.
- **My Books:** title, ISBN, genre, publication date, status, MRP, copies sold, royalty earned, paid and pending, last payout, and platforms.
  - Royalty summary with the **next payout date**, worked out from BookLeaf's quarterly + 45-day policy.
  - Notices for a balance below the ₹1,000 threshold (it rolls over) and for payouts that may be overdue, with a one-click royalty query.
  - Books still in production show a **stage progress bar** instead of empty sales figures.
- **Submit a query:** pick a book or *General / Account Level*, then a subject, a description (with a character counter) and up to 3 attachments (UI only, see limitations). Validation runs both in the browser and on the server, and server field errors appear on the right fields.
- **My Tickets:** status filters, the original query, the full conversation and follow-up replies. A reply on a *Resolved* ticket reopens it. Admin replies appear **without a page refresh**.

### Admin console

- **Ticket queue:**
  - Filters for status, category, priority, assignee, author, date range and search (including `#1004`). Filters live in the URL, so a view can be shared.
  - Default order is **unresolved → most urgent → oldest**. Each row has a priority colour strip, an *Awaiting reply* marker and the ticket's age. Tickets past their first-response SLA (Critical 4h · High 24h · Medium 48h · Low 72h) show in red.
- **Queue stats:** open, critical + high, SLA breached, unassigned / mine, how often the team kept the AI's category, AI-draft adoption and estimated AI spend.
- **AI auto-classification and priority:** runs in the background on every new ticket. The admin sees the AI's confidence and a one-line reason, and can **override** category or priority. Overrides are stored as `admin` and never overwritten by later AI runs.
- **AI-drafted reply:**
  - When a ticket is waiting on support, opening it fills the editor with a draft.
  - The draft is labelled *AI* or *Template*, lists the knowledge-base sections it is grounded in, and can be regenerated or restored after edits.
  - The sent reply appears on the author's ticket instantly.
- **Ticket management:** status changes, assign to self or a teammate (replying to an unassigned ticket auto-assigns it), **internal notes** that are never visible to authors, an author/account context panel (the same facts the AI sees) and an audit timeline.

---

## Architecture

```
┌──────────────────────────┐        REST + SSE (same origin)       ┌─────────────────────────────────────────┐
│ frontend/  (React SPA)   │  ───────────── /api/v1 ─────────────▶  │ backend/  (Express + TypeScript)         │
│ Vite · React 19 · RTK    │  ◀──── text/event-stream (SSE) ──────  │  routes → controllers → services →       │
│ Query · React Router ·   │                                        │  repositories → Mongoose models          │
│ Tailwind                 │                                        │            │              │              │
└──────────────────────────┘                                        │            ▼              ▼              │
                                                                    │        MongoDB      Anthropic Claude API │
                                                                    └─────────────────────────────────────────┘
```

**Two independent projects.** `frontend/` and `backend/` each have their own `package.json`, environment file and scripts. The frontend talks to the backend only through the documented REST API. In production the backend also serves the built SPA, so the whole app is a single same-origin service: one deploy, no CORS, httpOnly cookies and SSE work with no proxy setup.

### Backend — 3-tier, feature modules

```
backend/src/
├── app.ts · server.ts          # middleware chain, graceful shutdown
├── config/                     # env (Zod-validated at boot), pino logger, MongoDB
├── constants/                  # error codes, roles, ticket enums, SLA hours
├── middlewares/                # requireAuth + requireRoles, validateRequest (Zod), errorHandler,
│                               # rate limiters, request logging
├── utils/                      # ApiError, response envelopes, catchAsync
├── routes/index.ts             # mounts modules under /api/v1
├── scripts/                    # seed.ts (dataset → MongoDB), ai-smoke.ts
└── modules/
    ├── auth/ authors/ books/ tickets/ admin/ realtime/ docs/ health/
    │   ├── routes/        presentation: URL, auth, role, validation
    │   ├── controllers/   presentation: HTTP in/out only
    │   ├── services/      business rules, ownership checks, orchestration
    │   ├── repositories/  data access (all Mongoose queries)
    │   ├── models/ validations/ dtos/
    └── ai/                # knowledge base, prompts, AI client, triage/draft services, fallbacks
```

Key decisions:

| Decision | Why |
| --- | --- |
| Express + TypeScript + Mongoose, 3-tier modules | Business rules stay out of the transport layer, all queries live in repositories and each feature is self-contained. Easy to test and to explain. |
| MongoDB | Tickets, conversations and audit events are document-shaped. Relations are explicit `ObjectId` refs with indexes for the queue's sort and filter patterns. |
| Internal notes in their **own collection** | Authors can't receive notes by mistake: no author-facing query reads that collection. The separation is structural, not a filter. |
| Separate **author vs admin DTOs** | Authors never get priority, AI internals, assignee or audit data, even in the JSON. |
| 404 (not 403) for another author's ticket or book | Ids can't be probed for existence. |
| JWT in an **httpOnly, SameSite=Lax cookie** (plus Bearer for API clients) | No token in browser storage. Lax blocks cross-site POSTs. Bearer makes Postman/curl testing easy. |
| Royalty schedule computed **in code** | The payout date shown to the author and the one the AI quotes always match, and the LLM never does date maths. |
| Consistent error envelope `{ success:false, error:{ code, message, details } }` | Mongoose cast and validation errors, malformed JSON and duplicate keys map to 400/409 with field-level details. A 500 is only returned for genuinely unexpected errors. |
| Pino structured logs with request ids, and secrets redacted | Cheap, JSON-native, easy to ship to any log platform. |

### Frontend

`frontend/src` has `pages/` (author, admin, auth), `components/` (ui, tickets, admin, books, layout), `store/api` (RTK Query endpoints with cache tags), `hooks/useRealtime` (SSE), `routes/RequireRole`, `lib/` (formatting, constants, errors) and `types/` (mirrors the backend DTOs).

- RTK Query handles caching, de-duplication and invalidation. An SSE event simply invalidates the affected cache tags.
- Each portal is code-split, so authors never download the admin console.
- Route guards are for UX only. The API enforces every rule itself.

---

## Running locally

**Prerequisites:** Node.js 20+ and MongoDB running locally on `mongodb://127.0.0.1:27017`, or a MongoDB Atlas URI. Docker is not required.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env          # set JWT_SECRET; ANTHROPIC_API_KEY is optional
npm run seed                  # loads data/bookleaf_sample_data.json + demo tickets
npm run dev                   # http://localhost:5000/api/v1  (Swagger: /api/v1/docs)

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env          # dev port (5171) and API proxy target; no secrets
npm run dev                   # http://localhost:5171  (proxies /api to :5000)
```

The frontend runs on port **5171** (`DEV_SERVER_PORT` in `frontend/.env`, with `strictPort`). If you change it, update `FRONTEND_URL` in `backend/.env` too, because it is the backend's allowed CORS origin.

Generate a JWT secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

**Without an `ANTHROPIC_API_KEY` the app is still fully usable.** Tickets are classified by the rule-based fallback and admins get policy-based template drafts. The admin header shows *AI off · fallback mode*.

Useful scripts (backend): `npm test` (unit tests), `npm run ai:smoke` (runs the brief's sample queries through triage and drafts one reply), `npm run lint`, `npm run typecheck`, `npm run build`.

---

## AI integration

All AI code lives in `backend/src/modules/ai`. Ticket services call it with plain, pre-computed facts and never pass database documents.

### Model choice

- **Provider:** Anthropic Claude through the official `@anthropic-ai/sdk`.
- **Default model:** `claude-opus-5-5` for both triage and drafting. It has strong instruction-following and tone control, and it reliably sticks to the given facts instead of inventing them. That matters most here: a wrong payout date or a promised refund is worse than a slow reply.
- **Configurable per task:** `AI_TRIAGE_MODEL` and `AI_DRAFT_MODEL`. Classification is a narrow task. At high volume, `AI_TRIAGE_MODEL=claude-haiku-5-5` ($0.10 / $0.50 per M tokens) cuts triage cost by roughly 40× with little expected quality loss. Drafting, which authors read, is where the stronger model pays off.
- Both calls run with an explicit `effort` (`low` for triage, `medium` for drafts) to control thinking tokens and latency.

### 1. Triage — classification and priority

- **When:** right after a ticket is saved, in the background. The author never waits on the AI.
- **Output:** **structured output** validated against a Zod schema (`betaZodOutputFormat`): `{ category, priority, confidence, reasoning }`. No regex parsing of free text.
- **System prompt** (`prompts/triage.prompt.ts`, ~750 tokens, identical for every ticket):
  - category definitions;
  - a priority rubric taken from the brief (e.g. *no royalty for 6 months* → Critical, *author bio* → Low, ISBN errors → High per policy);
  - a rule that ticket text is data, not instructions (prompt-injection guard);
  - "tone alone must not decide priority".
- **User message** (~150 tokens): the ticket text, wrapped in tags with angle brackets neutralised, plus compact **account facts** such as the selected book's status, the pending royalty and a *payout needs review* flag. This lets the model tell "not on Amazon yet" for a book still in production apart from a real availability fault.
- **Policy guardrails** (`fallback/policy-guardrails.ts`) run after the AI *or* the rules. They can only raise priority, never lower it:
  - an ISBN error is always at least High (KB policy);
  - a royalty that "hasn't arrived", when records show no payout for over a full cycle, is at least High.
- The AI's suggestion is stored next to the final values. The share of AI suggestions the team kept gives a **live classification-quality metric** on the dashboard.

### 2. Drafted replies

- **System prompt** (`prompts/draft.prompt.ts`) is built **per category** and contains:
  - only the **relevant knowledge-base sections** (e.g. Royalty policy + Company overview);
  - BookLeaf's **tone guidelines**, verbatim;
  - the brief's **sample query → expected response** examples for that category, used for calibration;
  - writing rules: address by first name, acknowledge first, use the actual ₹ amounts and dates, own BookLeaf's mistakes, give concrete timelines (48h / 24–48h / 5–7 days), end with a next step, never invent facts or promise anything outside policy, and use the BookLeaf sign-off.
- **User message:** account facts (amounts, dates, statuses, platforms, and the computed next payout date and threshold), the original query and the latest turns of the conversation.
- **Never sent to the model:** internal notes, other authors' data, the API key.

### 3. Error handling and graceful degradation

Every call goes through `AiClientService`, which always returns a result object to its caller and never throws:

| Situation | Behaviour |
| --- | --- |
| No API key configured | App runs in fallback mode. Rules classify, templates draft, and the UI says so. |
| 429 / 5xx / network error | The SDK retries with backoff. An **overall deadline** (`AbortSignal`) caps the total wait: 20s for triage, 45s for drafts. |
| Repeated failures | **Circuit breaker:** after 3 consecutive provider failures, AI calls are skipped for 60s and fallbacks answer instantly. |
| Model refusal or unusable output | `refusal` / `invalid_output` → fallback. These don't trip the circuit. |
| Model refusal on supported models | Server-side refusal fallback (`fallbacks: "default"`) re-runs the request on Anthropic's recommended fallback model. |
| Triage fails | The ticket is still created and gets a **rule-based** category and priority (`fallback/rule-classifier.ts`, unit-tested against every example in the brief). It is marked *Rule-based* in the UI, and the admin can re-run AI triage. |
| Draft fails | The admin gets a **policy-accurate template** filled with the author's real data (amounts, threshold, next payout date, platforms). They can always just write the reply. |

`npm run ai:smoke` with an invalid key shows the whole path: `auth_error` → rules → the circuit opens after 3 failures → later calls fall back in ~0 ms → template draft.

### 4. Cost awareness

Measured prompt sizes (approximate tokens):

| Call | Input | Notes |
| --- | --- | --- |
| Triage | ~750 system + ~150 user | No knowledge base at all: classification only needs definitions. |
| Draft system prompt | ~950–1,130 for specific categories; ~1,490 for General | Only the matching KB sections and examples. The full KB + tone + all examples is ~1,500. |
| Draft conversation | Original query + last 5 messages, each truncated to 1,500 chars | 12 long messages: ~2,500 tokens instead of ~6,000+. |

Other levers:

- **Drafts are cached** per ticket until the conversation or category changes, so re-opening a ticket is free.
- Concurrent requests for the same draft share one call (**in-flight de-duplication**).
- A draft is generated automatically **only when the author is waiting on support**. Otherwise it is one click.
- *Regenerate* and *re-triage* are **rate-limited** per admin (15/min).
- The static system prompts are marked cacheable (`cache_control`). Caching only applies once a prompt exceeds the model's minimum cacheable length, and `cache_read_input_tokens` is logged so this can be verified.
- **Every call is logged** (`aiusagelogs`: operation, model, input/output/cache tokens, latency, success, failure reason). `/admin/stats` shows calls, failures and **estimated spend** per model.

**Rough estimate at list prices** (Opus 5.5: $4 / $20 per M tokens; output includes thinking):

- triage ≈ $0.005–0.01 per ticket;
- draft ≈ $0.02–0.04 per draft;
- with triage on Haiku 5.5 the triage cost becomes negligible (< $0.0005).

### 5. API key security

- The key is read only from `backend/.env` (`ANTHROPIC_API_KEY`), validated at boot, used only server-side and redacted from logs.
- The frontend has no AI SDK and no key. Its only env var is the API base URL.
- `.env` files are git-ignored. Only `.env.example` templates are committed.

---

## Real-time updates

**Server-Sent Events** are served at `GET /api/v1/realtime/stream`.

- When a ticket changes, the server pushes `ticket.updated { ticketId, reason }` to admins and to the author who owns it. Internal-note events go to admins only.
- Events carry **no ticket content**. The client invalidates its RTK Query cache and refetches through the normal REST endpoints, so access control lives in one place.
- `EventSource` reconnects automatically. While disconnected, views fall back to polling every 20s, and the header shows *Live / Reconnecting*.
- Measured locally: an admin reply appeared on the author's open ticket page **~100 ms** after the API call, with no reload.
- SSE was chosen over WebSockets because the traffic is one-way (server → client), it uses plain HTTP and cookies, and it needs no extra library.

---

## Data model

| Collection | Purpose / key fields |
| --- | --- |
| `users` | Login identity: email, bcrypt `passwordHash` (never selected by default), `role` (`author` \| `admin`), `author` ref |
| `authors` | Profile from the dataset (`authorCode` AUTH001…) |
| `books` | Dataset fields (`bookCode` BK001…). Nullable MRP and dates for books in production |
| `tickets` | `ticketNumber` (#1001…), author, book (null = general), subject, description, attachment metadata, `status`, `category` + `categorySource`, `priority` + `prioritySource` + `priorityRank`, `slaDueAt`, `triage` (AI suggestion, confidence, reasoning, model, fallback reason), assignee, activity timestamps |
| `ticketmessages` | Public conversation (`senderRole`, `aiAssisted`) |
| `ticketnotes` | Internal notes (admin only) |
| `ticketevents` | Append-only audit trail |
| `aidrafts` | Cached drafts (`source` ai/template, KB sections used, `basedOnMessageCount`) |
| `aiusagelogs` | Token and latency log per AI call |
| `counters` | Atomic sequence for ticket numbers |

The seed validates the JSON with Zod and checks royalty integrity: paid + pending = earned, and copies × rate = earned. The provided dataset passes both checks.

---

## API reference

Interactive **Swagger UI**: `/api/v1/docs` · raw OpenAPI 3 spec: `/api/v1/docs/openapi.json`.

- **Auth:** an httpOnly session cookie set by login, or `Authorization: Bearer <accessToken>` from the login response.
- **Success envelope:** `{ success: true, message, data }`.
- **Error envelope:** `{ success: false, error: { code, message, details? } }`. Codes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` / `INVALID_CREDENTIALS` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429.

| Method & path | Role | Description |
| --- | --- | --- |
| `POST /auth/login` | public | Email + password → session cookie and `accessToken` (rate-limited) |
| `POST /auth/logout` | public | Clear session |
| `GET /auth/me` | any | Current user |
| `GET /authors/me` | author | Profile, book counts, royalty summary, next payout date |
| `GET /authors` · `GET /authors/:authorId` | admin | List authors · one author's account summary |
| `GET /books` | any | Author: own books · Admin: all (`?authorId=`) |
| `GET /books/:bookId` | any | One book (404 if not yours) |
| `GET /tickets` | any | Author: own tickets · Admin: queue. Query: `status`, `category`, `priority` (comma lists), `assignee` (`me` \| `unassigned` \| id), `authorId`, `from`, `to`, `q`, `sort` (`urgency` \| `oldest` \| `newest` \| `recent_activity`), `page`, `limit` |
| `POST /tickets` | author | Create ticket `{ bookId?, subject, description, attachments? }`; triage runs in the background |
| `GET /tickets/:ticketId` | any | Detail. Admins also get triage data, notes and events |
| `PATCH /tickets/:ticketId` | admin | `{ status?, category?, priority?, assigneeId? }`: update, override or (un)assign |
| `POST /tickets/:ticketId/messages` | any | Reply. Admin: `{ body, status?, aiAssisted? }` (open → in progress, auto-assign). Author: reopens a resolved ticket; closed → 409 |
| `POST /tickets/:ticketId/notes` | admin | Internal note |
| `GET /tickets/:ticketId/ai-draft` | admin | Cached or new draft (`source: ai \| template`) + AI status |
| `POST /tickets/:ticketId/ai-draft` | admin | Regenerate draft (rate-limited) |
| `POST /tickets/:ticketId/ai-triage` | admin | Re-run classification (manual overrides preserved) |
| `GET /admin/stats` | admin | Queue counts, SLA breaches, AI agreement, usage and cost |
| `GET /admin/team` | admin | Admin users for assignment |
| `GET /realtime/stream` | any | SSE stream of `ticket.updated` events |
| `GET /health` | public | Liveness, database and AI availability |

---

## Testing

- **Unit tests** (`cd backend && npm test`, 17 passing):
  - payout schedule: payout windows, year boundary, ₹1,000 threshold rollover, the overdue-review flag, authors with only in-production books;
  - rule-based classifier: every sample query from the brief;
  - policy guardrails: raise-only behaviour.
- **Manually verified end to end** (curl and headless Chrome):
  - login and RBAC (401 / 403 / 404 across authors);
  - field-level validation errors;
  - ticket creation → background triage;
  - draft caching;
  - internal notes absent from author responses;
  - overrides kept across re-triage;
  - 409 on replying to a closed ticket;
  - SSE delivery to the author's open page (~100 ms);
  - AI failure path with the circuit breaker;
  - production mode serving the SPA with `Secure; HttpOnly; SameSite=Lax` cookies.

---

## Deployment

`render.yaml` (Render Blueprint) deploys **one web service**: it builds the frontend, builds the backend and starts the API, which also serves the SPA.

1. Create a free **MongoDB Atlas** cluster and copy its connection string.
2. On Render: **New → Blueprint** → select this repo. Then set:
   - `MONGODB_URI`;
   - `FRONTEND_URL` (the service URL, e.g. `https://bookleaf-support.onrender.com`);
   - `ANTHROPIC_API_KEY`.

   `JWT_SECRET` is generated automatically.
3. Seed the database once. Either run this from your machine, pointing at Atlas:
   `cd backend && MONGODB_URI="<atlas-uri>" npm run seed`
   or use the Render shell: `cd backend && npm run seed:prod`.

In production the server refuses to start with a placeholder `JWT_SECRET` or with `COOKIE_SECURE=false`.

---

## Known limitations and next steps

- **Attachments are UI-only.** The file name, size and type are stored, but not the file. Next step: presigned S3/GCS uploads with virus scanning, so print-defect photos reach the team and could be passed to a vision model.
- **In-memory SSE hub, circuit breaker and draft de-duplication.** These are correct on one instance. Horizontal scaling needs Redis pub/sub (or MongoDB change streams) for events, and a shared store for circuit state and locks.
- **Background triage is in-process** (`setImmediate`). A durable queue (BullMQ) would add retries and survive restarts. A periodic job could re-triage tickets left in fallback once the AI recovers.
- **No live-model evaluation set yet.** Next step: an eval of ~100 labelled historical tickets for category and priority accuracy, plus rubric-graded drafts, run on every prompt change. The dashboard's AI-agreement rate is the production signal in the meantime.
- **Auth is deliberately simple:** one 12-hour session token, no refresh/rotation, password reset, MFA or SSO. CSRF protection relies on SameSite=Lax cookies plus JSON-only endpoints. A CSRF token would be added if cross-site embedding were ever needed.
- **Royalty data is a snapshot.** The dataset has no per-quarter or per-platform breakdown, so the "payout needs review" flag is a heuristic (pending ≥ ₹1,000 and no payout for > 135 days). With real statements, exact overdue detection would be possible.
- **More product work:** email/WhatsApp notifications to authors, canned replies and macros, SLA escalations, CSAT after resolution, knowledge-base editing in the admin UI (today the KB lives in code), and automated e2e tests (Playwright) in CI.

See [WRITEUP.md](WRITEUP.md) for the approach, trade-offs and production roadmap.
