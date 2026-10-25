# Write-up: Approach, Trade-offs and Path to Production

**What I prioritised.** I built the core ticket loop first, end to end: an author raises a query, it is triaged, an admin replies with an AI draft, and the author sees the reply live. Breadth came after that. I treated the AI as one component inside a support system. It was never the system's single point of failure.

Three rules shaped the design:

1. **Facts are computed, words are generated.** Payout dates, the ₹1,000 threshold, overdue flags and production stages are computed in code, unit-tested and handed to the model as facts. The model writes the reply; it never does the arithmetic. The author's dashboard and the AI's reply use the same numbers, so they cannot disagree.
2. **The AI is optional at runtime.** Every call goes through one gateway that adds an overall deadline, typed error handling, a circuit breaker and usage logging. When the AI is down, tickets are still created and classified by a rule-based classifier tested against the brief's examples. Admins then get a policy-correct template filled with the author's real data. The UI tells the team which mode it is in.
3. **Send only the context the task needs.** Triage gets category and priority definitions and no knowledge base. Drafts get only the knowledge-base sections and examples for their category, the account facts and a trimmed conversation. Drafts are cached until the conversation changes and generated automatically only when the author is waiting. Every call's tokens are logged, and estimated spend appears on the admin dashboard.

**Trade-offs I made.**

- **MongoDB + Express 3-tier modules over a heavier framework.** The structure is familiar and easy to read, with clear layering (routes → controllers → services → repositories). Tickets and conversations fit documents well. I kept relations explicit and indexed.
- **SSE + cache invalidation over WebSockets.** Updates flow one way. Events carry only ids, and clients refetch through the REST API, so permissions are checked in one place. The cost is an in-process event hub, which is fine on one instance and needs Redis pub/sub to scale out.
- **One deployable.** The backend serves the built SPA in production, so cookies and SSE work with no CORS or proxy setup. The trade-off is that frontend and backend deploy together.
- **Attachments are metadata-only.** This is UI-only per the brief; I spent the time on AI quality and correctness instead.
- **Simple session auth.** A 12-hour httpOnly cookie with no refresh tokens or password reset. It is enough for this scope and is listed as a gap.
- **Opus-class default model.** Accuracy and tone matter more than cost in author-facing replies. Models are configurable per task, and triage can move to Haiku 5.5 for roughly 40× cheaper classification.

**How I'd take this to production.**

1. **Measure the AI before tuning it.**
   - Build an eval set from ~100 to 200 real historical tickets with agreed labels and gold replies.
   - Score classification accuracy, priority calibration and draft quality (rubric: policy accuracy, specificity, tone, clear next step) on every prompt or model change.
   - Track admin override rate and edit distance between draft and sent reply as live quality signals; both are already partly captured.
2. **Reliability and scale.**
   - Move background triage to a durable queue (BullMQ) with retries, and re-triage fallback tickets automatically once the AI recovers.
   - Share event fan-out and circuit state through Redis.
   - Run the API with several stateless instances behind a load balancer.
3. **Grounding beyond a static KB.**
   - Store the knowledge base in the database with an admin editor and versioning.
   - Connect real systems through tools: royalty statements per quarter and platform, production tracker stages, distribution sync status. Drafts could then say "your Q2 statement shows…" and actions like "trigger re-sync" become one click.
4. **Author experience.**
   - Email and WhatsApp notifications on replies.
   - Real file uploads, with photos of print defects going to the team (and optionally a vision model).
   - Self-serve answers before a ticket is created, plus CSAT after resolution.
5. **Operations and security.**
   - SSO for staff, refresh-token rotation, a CSRF token if the app is ever embedded cross-site, audit log export, and PII redaction before prompts.
   - Spend budgets and alerts on AI usage.
   - Observability: traces around AI calls, and dashboards for SLA, backlog and AI agreement.
