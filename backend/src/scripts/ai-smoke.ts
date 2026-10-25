/**
 * Quick end-to-end check of the AI layer, without the web app:
 *
 *   npm run ai:smoke
 *
 * Classifies the sample queries from the assignment brief and drafts one reply. With a valid
 * ANTHROPIC_API_KEY you see live model output; without one (or with the provider down) you see
 * the rule-based / template fallbacks — the same path the app takes.
 */
import { connectDatabase, disconnectDatabase } from "../config/database";
import { aiClient } from "../modules/ai/services/ai-client.service";
import { aiDraftService } from "../modules/ai/services/ai-draft.service";
import { aiTriageService } from "../modules/ai/services/ai-triage.service";
import type { RoyaltyFacts } from "../modules/ai/types/ai.types";

const royalty: RoyaltyFacts = {
  totalRoyaltyPending: 2546,
  meetsPayoutThreshold: true,
  payoutThresholdInr: 1000,
  lastPayoutDate: null,
  payoutNeedsReview: true,
  nextPayoutQuarter: "Q3 2026 (Jul–Sep)",
  nextPayoutBy: "2026-11-14",
};

const SAMPLES = [
  "I haven't received any royalty for 6 months.",
  "Can I update my author bio?",
  "My book is showing a different ISBN on Amazon than what's on the physical copy.",
  "I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.",
  "My book is published but it's showing as 'Currently Unavailable' on Amazon.",
  "It's been 3 weeks and my book is still in typesetting. When will it be done?",
];

async function main() {
  await connectDatabase();
  console.log("\nAI status:", aiClient.getStatus(), "\n");

  for (const description of SAMPLES) {
    const started = Date.now();
    const result = await aiTriageService.triage(
      { subject: description.slice(0, 40), description, book: null, royalty },
      null,
    );
    console.log(
      `[${result.source}${result.fallbackReason ? `:${result.fallbackReason}` : ""}] ${result.category} / ${result.priority}` +
        ` (${Date.now() - started} ms) — ${description}\n    ${result.reasoning}`,
    );
  }

  const started = Date.now();
  const draft = await aiDraftService.draft(
    {
      ticketNumber: 1001,
      subject: "No royalty received since my book was published",
      category: "royalty_payments",
      status: "open",
      author: { name: "Ananya Reddy", firstName: "Ananya", joinedDate: "2024-02-20" },
      book: null,
      otherBooks: [{ title: "Between Two Temples", status: "Published & Live" }],
      royalty,
      conversation: [
        {
          role: "author",
          body: "My book was published in July 2024 and I have not received a single rupee in royalty. It has been more than a year.",
          createdAt: new Date().toISOString(),
        },
      ],
      today: new Date().toISOString().slice(0, 10),
    },
    "000000000000000000000000",
  );
  console.log(
    `\n--- Draft [${draft.source}${draft.fallbackReason ? `:${draft.fallbackReason}` : ""}] (${Date.now() - started} ms)\n${draft.content}\n`,
  );
  console.log("AI status after run:", aiClient.getStatus());

  // Usage logs are written fire-and-forget; give them a moment before closing the connection.
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
