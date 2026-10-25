import { Check, MessageSquarePlus } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { PRODUCTION_STAGES } from "@/lib/constants";
import { formatDate, formatInr, formatNumber } from "@/lib/format";
import type { Book } from "@/types/api";

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-sm font-semibold tabular-nums", emphasis ? "text-brand-700" : "text-ink")}>{value}</dd>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-muted">{label}: </span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function ProductionProgress({ stageIndex, stage }: { stageIndex: number | null; stage: string }) {
  return (
    <div className="mt-5">
      <p className="text-sm text-ink">
        Currently in <span className="font-semibold">{stage}</span>
        {stageIndex && <span className="text-muted"> · stage {stageIndex} of {PRODUCTION_STAGES.length}</span>}
      </p>
      <ol className="mt-3 flex items-center gap-1" aria-label="Production progress">
        {PRODUCTION_STAGES.map((name, index) => {
          const position = index + 1;
          const done = stageIndex !== null && position < stageIndex;
          const current = position === stageIndex;
          return (
            <li key={name} title={name} className="flex-1">
              <div
                className={cn(
                  "flex h-1.5 rounded-full",
                  done ? "bg-leaf-500" : current ? "bg-amber-400" : "bg-slate-200",
                )}
              />
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-muted">
        You'll get an email at every stage. Sales and royalties appear here once the book is published.
      </p>
    </div>
  );
}

export function BookCard({ book }: { book: Book }) {
  const published = book.production.isPublished;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-lg font-semibold text-ink">{book.title}</h3>
          <p className="text-sm text-muted">{book.genre ?? "—"}</p>
        </div>
        {published ? (
          <Badge tone="green" icon={<Check className="size-3" />}>Published & Live</Badge>
        ) : (
          <Badge tone="amber">In production</Badge>
        )}
      </div>

      <div className="mt-4 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="ISBN" value={book.isbn ?? "Not assigned yet"} />
        <Meta label="Published" value={published ? formatDate(book.publicationDate) : "Not yet"} />
        <Meta label="MRP" value={book.mrp !== null ? formatInr(book.mrp) : "Set at publication"} />
        <Meta label="Printed by" value={book.printPartner ?? "—"} />
      </div>

      {published ? (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-canvas p-4 sm:grid-cols-4">
            <Stat label="Copies sold" value={formatNumber(book.totalCopiesSold)} />
            <Stat label="Royalty earned" value={formatInr(book.totalRoyaltyEarned)} />
            <Stat label="Royalty paid" value={formatInr(book.royaltyPaid)} />
            <Stat label="Royalty pending" value={formatInr(book.royaltyPending)} emphasis={book.royaltyPending > 0} />
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <span>
              Last payout:{" "}
              <span className="font-medium text-ink">
                {book.lastRoyaltyPayoutDate ? formatDate(book.lastRoyaltyPayoutDate) : "No payout yet"}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              Available on:
              {book.availableOn.map((platform) => (
                <Badge key={platform} tone="brand">{platform}</Badge>
              ))}
            </span>
          </div>
        </>
      ) : (
        <ProductionProgress stageIndex={book.production.stageIndex} stage={book.production.stage} />
      )}

      <div className="mt-5 border-t border-line pt-4">
        <Link
          to={`/tickets/new?bookId=${book.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <MessageSquarePlus className="size-4" />
          Ask about this book
        </Link>
      </div>
    </Card>
  );
}
