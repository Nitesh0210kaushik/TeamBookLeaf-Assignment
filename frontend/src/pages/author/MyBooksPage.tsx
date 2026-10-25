import { AlertTriangle, BookOpen, CalendarClock, Info, IndianRupee, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookCard } from "@/components/books/BookCard";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui/States";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getErrorMessage } from "@/lib/errors";
import { firstName, formatDate, formatInr, formatNumber } from "@/lib/format";
import { useGetBooksQuery, useGetMyAccountQuery } from "@/store/api/accountApi";

function SummaryCard({ icon, label, value, footnote }: { icon: ReactNode; label: string; value: string; footnote: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        <span className="text-brand-600">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-muted">{footnote}</div>
    </Card>
  );
}

export function MyBooksPage() {
  usePageTitle("My Books");
  const account = useGetMyAccountQuery();
  const books = useGetBooksQuery();

  if (account.isLoading || books.isLoading) return <Spinner label="Loading your books…" />;
  if (account.error || books.error || !account.data || !books.data) {
    return (
      <ErrorState
        message={getErrorMessage(account.error ?? books.error)}
        onRetry={() => {
          account.refetch();
          books.refetch();
        }}
      />
    );
  }

  const { author, royaltySummary: royalty, bookCounts } = account.data;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName(author.name)}`}
        description={`${bookCounts.total} book${bookCounts.total === 1 ? "" : "s"} with BookLeaf · ${bookCounts.published} published${bookCounts.inProduction ? `, ${bookCounts.inProduction} in production` : ""}`}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<IndianRupee className="size-4" />}
          label="Total royalty earned"
          value={formatInr(royalty.totalRoyaltyEarned)}
          footnote={`${formatNumber(royalty.totalCopiesSold)} copies sold`}
        />
        <SummaryCard
          icon={<Wallet className="size-4" />}
          label="Royalty paid"
          value={formatInr(royalty.totalRoyaltyPaid)}
          footnote={royalty.lastPayoutDate ? `Last payout ${formatDate(royalty.lastPayoutDate)}` : "No payout yet"}
        />
        <SummaryCard
          icon={<IndianRupee className="size-4" />}
          label="Royalty pending"
          value={formatInr(royalty.totalRoyaltyPending)}
          footnote={
            royalty.totalRoyaltyPending === 0
              ? "You're all caught up"
              : royalty.meetsPayoutThreshold
                ? "Included in the next payout run"
                : `Below the ${formatInr(royalty.payoutThresholdInr)} minimum — rolls over to next quarter`
          }
        />
        <SummaryCard
          icon={<CalendarClock className="size-4" />}
          label="Next payout run"
          value={`by ${formatDate(royalty.schedule.nextPayoutBy)}`}
          footnote={`For ${royalty.schedule.nextPayoutQuarter} earnings`}
        />
      </section>

      {royalty.payoutNeedsReview && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-start">
          <AlertTriangle className="hidden size-4 shrink-0 sm:mt-0.5 sm:block" />
          <p className="flex-1">
            You have {formatInr(royalty.totalRoyaltyPending)} pending and it has been more than a full payout cycle
            since {royalty.lastPayoutDate ? "your last payout" : "your book was published"}. If you haven't received
            it, let us know — our finance team will check within 48 hours.
          </p>
          <Link
            to="/tickets/new?topic=royalty"
            className="self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white hover:bg-amber-700"
          >
            Raise a royalty query
          </Link>
        </div>
      )}

      <details className="mt-4 rounded-xl border border-line bg-white px-4 py-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-medium text-ink">
          <Info className="size-4 text-brand-600" /> How royalties are calculated and paid
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
          <li>You receive 80% of the net profit per copy (MRP minus printing cost, platform commission and shipping).</li>
          <li>Royalties are calculated every quarter and paid within 45 days of the quarter ending, by bank transfer.</li>
          <li>Payouts are made once your pending balance reaches ₹1,000; smaller amounts roll over — nothing is lost.</li>
        </ul>
      </details>

      <section className="mt-8">
        <h2 className="mb-4 text-base font-semibold text-ink">My books</h2>
        {books.data.length === 0 ? (
          <Card>
            <EmptyState
              icon={<BookOpen className="size-5" />}
              title="No books yet"
              description="Once your manuscript is received, your book and its progress will appear here."
            />
          </Card>
        ) : (
          <div className="grid gap-4">
            {books.data.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
