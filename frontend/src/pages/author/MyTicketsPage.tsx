import { ChevronRight, MessageCircleReply, MessagesSquare, PenSquare } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/tickets/TicketBadges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui/States";
import { useFallbackPolling } from "@/hooks/useRealtime";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { useListMyTicketsQuery } from "@/store/api/ticketsApi";

const FILTERS = [
  { key: "active", label: "Active", match: (s: string) => s === "open" || s === "in_progress" },
  { key: "done", label: "Resolved & closed", match: (s: string) => s === "resolved" || s === "closed" },
  { key: "all", label: "All", match: () => true },
] as const;

export function MyTicketsPage() {
  const navigate = useNavigate();
  const pollingInterval = useFallbackPolling();
  const { data, isLoading, error, refetch } = useListMyTicketsQuery(undefined, { pollingInterval });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  if (isLoading) return <Spinner label="Loading your tickets…" />;
  if (error || !data) return <ErrorState message={getErrorMessage(error)} onRetry={refetch} />;

  const active = FILTERS.find((f) => f.key === filter)!;
  const tickets = data.tickets.filter((ticket) => active.match(ticket.status));

  return (
    <>
      <PageHeader
        title="My tickets"
        description="Every query you've raised and the BookLeaf team's replies. Updates appear here automatically."
        actions={
          <Button icon={<PenSquare className="size-4" />} onClick={() => navigate("/tickets/new")}>
            New query
          </Button>
        }
      />

      {data.tickets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MessagesSquare className="size-5" />}
            title="No tickets yet"
            description="Questions about royalties, your ISBN, print quality or where your book is in production? We're here to help."
            action={<Button onClick={() => navigate("/tickets/new")}>Raise your first query</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex gap-1 rounded-lg bg-white p-1 ring-1 ring-line w-fit">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  filter === f.key ? "bg-brand-700 text-white" : "text-muted hover:text-ink",
                )}
              >
                {f.label}
                <span className="ml-1.5 text-xs opacity-75">{data.tickets.filter((t) => f.match(t.status)).length}</span>
              </button>
            ))}
          </div>

          <Card className="divide-y divide-line overflow-hidden">
            {tickets.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted">Nothing here.</p>}
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted tabular-nums">#{ticket.ticketNumber}</span>
                    <span className="truncate text-sm font-semibold text-ink">{ticket.subject}</span>
                    {ticket.hasSupportReply && ticket.status !== "closed" && (
                      <Badge tone="brand" icon={<MessageCircleReply className="size-3" />}>Support replied</Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {ticket.book?.title ?? "General / Account"}
                    {ticket.categoryLabel && <> · {ticket.categoryLabel}</>} · updated {timeAgo(ticket.lastActivityAt)}
                  </div>
                </div>
                <StatusBadge status={ticket.status} />
                <ChevronRight className="size-4 text-slate-400" />
              </Link>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
