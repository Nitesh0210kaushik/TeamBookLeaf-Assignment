# BookLeaf Author Support & Communication Portal

An author portal (books, royalties, support tickets) and an admin console (ticket queue with AI classification, AI priority scoring and AI-drafted replies grounded in the BookLeaf knowledge base).

**Live demo:** https://teambookleaf-assignment.onrender.com · **API docs (Swagger):** https://teambookleaf-assignment.onrender.com/api/v1/docs

> Hosted on Render's free tier. The first request after ~15 minutes of inactivity can take up to a minute while the service wakes up.

## Test credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@bookleaf.com` (also `ops@bookleaf.com`) | `Admin@123` |
| Author | any author email from `bookleaf_sample_data.json`, e.g. `priya.sharma@email.com` | `Author@123` |

Useful authors for edge cases:
- `sneha.kulkarni@email.com`: one book still in production.
- `kavita.deshmukh@email.com`: pending royalty below the ₹1,000 threshold.
- `ananya.reddy@email.com`: never paid.
- `arjun.malhotra@email.com`: no tickets yet.

---

## Running locally

**Prerequisites:** Node.js 20+ and MongoDB (local or an Atlas URI).

```bash
# Backend — http://localhost:5000/api/v1
cd backend
npm install
cp .env.example .env     # set JWT_SECRET; add GROQ_API_KEY (free) to enable AI
npm run seed             # loads data/bookleaf_sample_data.json + demo tickets
npm run dev

# Frontend — http://localhost:5173 (proxies /api to the backend)
cd frontend
npm install
cp .env.example .env
npm run dev
```

- **Without an AI key the app still works fully.** Tickets are classified by keyword rules, and admins get policy-based template drafts.
- **Other commands:** `npm test` runs the backend unit tests. `npm run ai:smoke` runs the brief's sample queries through the AI.

---

## Architecture decisions

```
frontend/  React 19 + Vite + RTK Query + Tailwind ──REST /api/v1 + SSE──▶  backend/  Express + TypeScript
                                                                            routes → controllers → services → repositories → MongoDB
                                                                                                    └─▶ LLM provider (Groq / Claude)
```

`frontend/` and `backend/` are independent projects that talk only through the REST API. In production the backend also serves the built frontend, so the app runs as one same-origin service (no CORS; cookies and SSE work without a proxy).

The backend uses **3-tier feature modules** (`backend/src/modules/<feature>/{routes, controllers, services, repositories, models, validations, dtos}`):
- routes and controllers handle HTTP;
- services hold business rules and ownership checks;
- repositories hold every database query.

| Decision | Why |
| --- | --- |
| MongoDB + Mongoose | Tickets, conversations and audit events are document-shaped. Relations are indexed `ObjectId` refs. Collections: `users`, `authors`, `books`, `tickets`, `ticketmessages`, `ticketnotes`, `ticketevents`, `aidrafts`, `aiusagelogs`. |
| Internal notes in their **own collection** | No author-facing query can ever return them. The separation is structural, not a filter. |
| Separate author / admin response DTOs | Authors never receive priority, AI data, assignee or audit events. |
| JWT in an httpOnly, SameSite=Lax cookie (+ Bearer for API clients) | No token in browser storage. Postman and curl still work. |
| RBAC in middleware + services; **404** for other authors' data | Authors can't probe ids. Admins see everything. |
| Zod validation and one error format `{ success:false, error:{ code, message, details } }` | Field-level 400s and meaningful 401/403/404/409/429. A 500 is returned only for unexpected errors. |
| Royalty payout schedule computed **in code** (quarterly + 45 days, ₹1,000 threshold) | The date on the author's dashboard and the date the AI quotes are always the same. The model never does date maths. |
| **Server-Sent Events** for real-time | Events carry only `{ ticketId, reason }`; the client refetches through REST, so access control stays in one place. One-way traffic, plain HTTP. Polling is used as a fallback while disconnected. |

---

## AI integration

All AI code is in `backend/src/modules/ai`.

### Provider and model choice
The AI layer is provider-agnostic: prompts, knowledge base, guardrails, fallbacks and logging are shared, and each provider only maps two calls (structured JSON and text) onto its official SDK. Switch providers with `AI_PROVIDER`.

- **Groq (used in the live demo):**
  - `openai/gpt-oss-20b` for triage and `openai/gpt-oss-120b` for drafts.
  - Free tier and very fast (measured: triage under 1 s, drafts about 1 s).
  - These are production models with **strict JSON-schema** output, so triage always returns valid data.
- **Anthropic Claude** (`AI_PROVIDER=anthropic`): `claude-opus-5-5`, for when reply quality matters more than cost. Same prompts, two env vars to switch.

### Prompt strategy
- **Triage** (runs in the background after a ticket is saved, so the author never waits):
  - **System prompt:** a static prompt with the category definitions and a priority rubric based on the brief (no royalty for 6+ months → Critical, author bio → Low, ISBN errors → High). It also tells the model that ticket text is data, not instructions.
  - **User message:** the ticket plus compact account facts: book status, pending royalty, and a payout-overdue flag.
  - **Output:** `{ category, priority, confidence, reasoning }`, validated with Zod.
  - **Guardrails:** deterministic policy rules run afterwards and can only raise priority (ISBN error ≥ High; royalty missing for 6+ months → Critical).
  - **Overrides:** admins can override category or priority. The AI's original suggestion is kept, which gives an "AI category kept by team" accuracy metric.
- **Drafted replies** (generated when an admin opens a ticket):
  - **System prompt:** only the knowledge-base sections for that ticket's category, BookLeaf's tone guidelines, and the brief's sample responses for that category.
  - **User message:** the author's real facts (₹ amounts, dates, next payout date) and the conversation.
  - **Writing rules:**
    - acknowledge the concern first, be specific, and own BookLeaf's mistakes;
    - use only the timelines stated in the policies, and end with a clear next step;
    - never invent contact details, dates or promises.
  - Internal notes are never sent to the model. The admin edits the draft before sending.

### Error handling (graceful degradation)
- Every AI call goes through one client, which returns a result and never throws. Tickets are always created.
- Errors are classified: rate limit, timeout, provider, auth, refusal, invalid output.
- The SDK retries with backoff, and an overall deadline caps the total wait (20 s for triage, 45 s for drafts).
- **Circuit breaker:** after 3 consecutive provider failures, AI calls are skipped for 60 s and fallbacks answer instantly.
- **Fallbacks:** a keyword classifier (unit-tested on every sample query in the brief) and policy templates filled with the author's real data. The UI shows when AI assist is off or paused, and admins can always write replies manually.

### Cost management
- **Small prompts, measured:**
  - triage ≈ 750 + 150 tokens, with no knowledge base;
  - drafts ≈ 950–1,500 tokens of system prompt (only the relevant KB sections; the full KB is ~1,500);
  - conversations trimmed to the original query plus the last 5 messages (~2,500 tokens instead of 6,000+ for long threads).
- **Drafts are cached** until the conversation changes, and concurrent requests share one call.
- A draft is generated automatically only when the author is waiting on support.
- Regenerate and re-triage are rate-limited per admin.
- **Every call is logged** (tokens, latency, failures). The admin dashboard shows usage and estimated spend.
- **What it costs:** $0 on Groq's free tier. On Claude Opus 5.5 it is ≈ $0.01 per triage and ≈ $0.03 per draft.

### API key security
- Keys live only in `backend/.env` (`GROQ_API_KEY` / `ANTHROPIC_API_KEY`), are used server-side only and are redacted from logs.
- The frontend never sees a key.
- `.env` files are git-ignored.

---

## API documentation

Full interactive docs are in Swagger at `/api/v1/docs` (OpenAPI spec at `/api/v1/docs/openapi.json`). All routes except login, session and health require a session cookie or `Authorization: Bearer <token>`.

| Endpoint | Role | Purpose |
| --- | --- | --- |
| `POST /auth/login` · `POST /auth/logout` · `GET /auth/session` · `GET /auth/me` | — | Sign in / out, session check, current user |
| `GET /authors/me` | author | Profile, royalty summary, next payout date |
| `GET /authors` · `GET /authors/:id` | admin | Authors and their account summary |
| `GET /books` · `GET /books/:id` | any | Own books (author) or all books (admin) |
| `GET /tickets` | any | Own tickets (author) or queue with filters: `status`, `category`, `priority`, `assignee`, `from`, `to`, `q`, `sort`, `page` |
| `POST /tickets` | author | Raise a ticket (AI triage runs in the background) |
| `GET /tickets/:id` | any | Ticket detail (admins also get notes, AI data, activity) |
| `PATCH /tickets/:id` | admin | Status, category/priority override, assignment |
| `POST /tickets/:id/messages` | any | Reply (admin replies are visible to the author) |
| `POST /tickets/:id/notes` | admin | Internal note |
| `GET` / `POST /tickets/:id/ai-draft` | admin | Get or regenerate the AI-drafted reply |
| `POST /tickets/:id/ai-triage` | admin | Re-run AI classification |
| `GET /admin/stats` · `GET /admin/team` | admin | Queue and AI metrics, team list |
| `GET /realtime/stream` | any | Live ticket updates (SSE) |

---

## Known limitations and next steps

- **Attachments are UI-only:** only file metadata is stored. Next: S3 uploads, so print-defect photos reach the team.
- **Single-instance only:** the SSE hub, circuit breaker and draft de-duplication are in memory. Scaling out needs Redis pub/sub and shared state.
- **In-process background triage:** a job queue (e.g. BullMQ) would add retries, and could re-triage tickets that fell back to rules once the AI recovers.
- **No evaluation set:** next is a labelled set of past tickets to measure classification and draft quality on every prompt change.
- **Simple auth:** no password reset, refresh tokens, MFA or SSO.
- **More product work:** notifications to authors (email/WhatsApp), canned replies, SLA escalations, and a knowledge-base editor for the ops team.

See [WRITEUP.md](WRITEUP.md) for the approach, trade-offs and production roadmap.
