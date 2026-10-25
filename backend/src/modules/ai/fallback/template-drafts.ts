import type { TicketCategory } from "../../../constants/ticket";
import { formatDate, formatInr } from "../prompts/facts";
import type { DraftInput } from "../types/ai.types";

const SIGN_OFF = "Warm regards,\nBookLeaf Author Support";

/**
 * Policy-accurate starting points used when the AI is unavailable. They follow the same tone
 * guidelines and pull in real account facts, so the admin only has to personalise, not start blank.
 */
const TEMPLATES: Record<TicketCategory, (input: DraftInput, bookTitle: string) => string> = {
  royalty_payments: (input, bookTitle) => {
    const { royalty } = input;
    const thresholdLine = royalty.meetsPayoutThreshold
      ? `Your pending royalty is currently ${formatInr(royalty.totalRoyaltyPending)}, which is above the ${formatInr(royalty.payoutThresholdInr)} payout threshold.`
      : `Your pending royalty is currently ${formatInr(royalty.totalRoyaltyPending)}. Payouts are made once the balance reaches ${formatInr(royalty.payoutThresholdInr)}; until then it rolls over to the next quarter, so nothing is lost.`;
    const reviewLine = royalty.payoutNeedsReview
      ? "Since it has been longer than a full payout cycle, I have escalated this to our finance team and we will get back to you within 48 hours."
      : `The next payout run covers earnings for ${royalty.nextPayoutQuarter} and will be made by ${formatDate(royalty.nextPayoutBy)}.`;

    return `I completely understand your concern about the royalties for ${bookTitle}, and I want to make sure you have a clear picture.

Royalties are calculated quarterly and paid within 45 days of each quarter ending, by bank transfer to the account linked in your dashboard. ${thresholdLine}

${reviewLine} Could you also confirm that your bank details in the dashboard are up to date? If you'd like, we can share a detailed line-by-line royalty breakdown.`;
  },

  isbn_metadata: (_input, bookTitle) =>
    `Thank you for flagging this about ${bookTitle} — an ISBN or metadata mismatch is a serious issue, and I'm sorry for the trouble it has caused.

I have escalated this to our production team as a high-priority issue. They will verify the ISBN records across the platforms and the printed copy, and we will get back to you within 48 hours with the resolution.

If you have a screenshot of the listing showing the mismatch, please share it here — it will help the team resolve it faster.`,

  printing_quality: (_input, bookTitle) =>
    `I'm really sorry that the printed copies of ${bookTitle} did not meet the standard you expected — that is not the experience we want for you.

Could you please share a few clear photos of the defective pages or copies? Once our team verifies the issue, BookLeaf will arrange a free reprint, which typically takes 5–7 business days from confirmation.

As soon as we receive the photos, we will confirm the reprint and keep you updated.`,

  distribution_availability: (input, bookTitle) => {
    const platforms = input.book?.availableOn.length
      ? ` (currently listed on ${input.book.availableOn.join(", ")})`
      : "";
    return `Thank you for letting us know about the availability of ${bookTitle}${platforms}. I understand how frustrating it is when readers can't buy your book.

This is usually caused by a stock sync issue with the platform. I'm triggering a re-sync with our distribution team now, and the listing should be live again within 24–48 hours.

We'll confirm here once it's back. If it still shows as unavailable after 48 hours, please reply on this ticket and we'll escalate it right away.`;
  },

  book_status_production: (input, bookTitle) => {
    const stage =
      input.book && !input.book.isPublished
        ? ` It is currently at the ${input.book.status.replace(/^In Production\s*-\s*/i, "")} stage.`
        : "";
    return `Thank you for checking in on ${bookTitle} — I know how much you're looking forward to seeing it published.${stage}

Our production stages are Editing (if opted), Cover Design, Typesetting, Proofreading, ISBN Assignment, Printing and Distribution Setup, and you'll receive an email update at each stage. I'm checking with the production team on the exact timeline for your book and will update you within 48 hours.

If there are any approvals pending from your side, we'll flag them in that update so we can move forward together.`;
  },

  general_inquiry: () =>
    `Thank you for reaching out to us.

[Answer the author's question here.] For reference, metadata updates such as your book description can be submitted through your dashboard or by emailing the BookLeaf team, and changes typically reflect on platforms within 3–5 business days.

Please let us know if there's anything else we can help you with.`,
};

export function buildTemplateDraft(input: DraftInput) {
  const bookTitle = input.book ? `"${input.book.title}"` : "your account";
  const body = TEMPLATES[input.category](input, bookTitle);
  return `Dear ${input.author.firstName},\n\n${body}\n\n${SIGN_OFF}`;
}
