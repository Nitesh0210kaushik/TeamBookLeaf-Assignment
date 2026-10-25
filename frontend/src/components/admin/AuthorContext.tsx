import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/States";
import { formatDate, formatInr, formatNumber } from "@/lib/format";
import { useGetAuthorAccountQuery, useGetBooksQuery } from "@/store/api/accountApi";
import type { AdminTicketDetail } from "@/types/api";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{children}</span>
    </div>
  );
}

/** The facts an agent needs to answer without leaving the ticket — the same ones the AI sees. */
export function AuthorContext({ ticket }: { ticket: AdminTicketDetail }) {
  const authorId = ticket.author?.id ?? "";
  const { data: account, isLoading } = useGetAuthorAccountQuery(authorId, { skip: !authorId });
  const { data: books } = useGetBooksQuery({ authorId }, { skip: !authorId });
  const book = books?.find((b) => b.id === ticket.book?.id);

  return (
    <Card>
      <CardHeader title="Author & account" description="From BookLeaf records" />
      {isLoading || !account ? (
        <Spinner className="py-6" />
      ) : (
        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-ink">{account.author.name}</div>
            <div className="text-xs text-muted">
              {account.author.email} · {account.author.city ?? "—"} · since {formatDate(account.author.joinedDate)}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-ink">Royalties (all books)</div>
            <Fact label="Pending">{formatInr(account.royaltySummary.totalRoyaltyPending)}</Fact>
            <Fact label="₹1,000 threshold">{account.royaltySummary.meetsPayoutThreshold ? "Met" : "Not met — rolls over"}</Fact>
            <Fact label="Last payout">{account.royaltySummary.lastPayoutDate ? formatDate(account.royaltySummary.lastPayoutDate) : "Never"}</Fact>
            <Fact label="Next payout run">by {formatDate(account.royaltySummary.schedule.nextPayoutBy)}</Fact>
            {account.royaltySummary.payoutNeedsReview && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Above threshold with no payout for over a full cycle — check with finance.
              </p>
            )}
          </div>

          {book ? (
            <div className="space-y-1.5 border-t border-line pt-4">
              <div className="text-xs font-semibold text-ink">{book.title}</div>
              <Fact label="Status">{book.production.isPublished ? "Published & Live" : `In production · ${book.production.stage}`}</Fact>
              <Fact label="ISBN">{book.isbn ?? "—"}</Fact>
              {book.production.isPublished && (
                <>
                  <Fact label="Published">{formatDate(book.publicationDate)}</Fact>
                  <Fact label="MRP">{formatInr(book.mrp)}</Fact>
                  <Fact label="Copies sold">{formatNumber(book.totalCopiesSold)}</Fact>
                  <Fact label="Earned / paid">{formatInr(book.totalRoyaltyEarned)} / {formatInr(book.royaltyPaid)}</Fact>
                  <Fact label="Pending">{formatInr(book.royaltyPending)}</Fact>
                  <Fact label="Print partner">{book.printPartner ?? "—"}</Fact>
                  <Fact label="Available on">{book.availableOn.join(", ") || "—"}</Fact>
                </>
              )}
            </div>
          ) : (
            <p className="border-t border-line pt-4 text-xs text-muted">General / account-level query — no specific book.</p>
          )}
        </div>
      )}
    </Card>
  );
}
