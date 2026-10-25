import { AlarmClock, ChevronLeft, ChevronRight, Inbox, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QueueStats } from "@/components/admin/QueueStats";
import { PRIORITY_BORDER, PriorityBadge, SourceTag, StatusBadge } from "@/components/tickets/TicketBadges";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/components/ui/States";
import { useFallbackPolling } from "@/hooks/useRealtime";
import { cn } from "@/lib/cn";
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { ageOf, timeAgo } from "@/lib/format";
import { useGetStatsQuery, useGetTeamQuery } from "@/store/api/adminApi";
import { useMeQuery } from "@/store/api/authApi";
import { useListQueueQuery } from "@/store/api/ticketsApi";
import type { TicketListQuery } from "@/types/api";

const STATUS_OPTIONS = [
  { value: "open,in_progress", label: "Unresolved" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "", label: "All statuses" },
];

const DEFAULT_STATUS = "open,in_progress";
const PAGE_SIZE = 20;

/** Filters live in the URL so a filtered view survives refresh and can be shared with a teammate. */
function useQueueFilters() {
  const [params, setParams] = useSearchParams();

  const query: TicketListQuery = {
    status: params.has("status") ? params.get("status") || undefined : DEFAULT_STATUS,
    category: params.get("category") || undefined,
    priority: params.get("priority") || undefined,
    assignee: params.get("assignee") || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    q: params.get("q") || undefined,
    sort: (params.get("sort") as TicketListQuery["sort"]) || "urgency",
    page: Number(params.get("page") ?? 1),
    limit: PAGE_SIZE,
  };

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  return { query, update, reset: () => setParams(new URLSearchParams(), { replace: true }), params };
}

export function QueuePage() {
  const navigate = useNavigate();
  const pollingInterval = useFallbackPolling();
  const { query, update, reset, params } = useQueueFilters();
  const { data: me } = useMeQuery();
  const { data: team } = useGetTeamQuery();
  const { data: stats } = useGetStatsQuery(undefined, { pollingInterval });
  const { data, isLoading, isFetching, error, refetch } = useListQueueQuery(query, { pollingInterval });

  const [search, setSearch] = useState(query.q ?? "");
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((query.q ?? "") !== search.trim()) update({ q: search.trim() || null });
    }, 350);
    return () => clearTimeout(timer);
    // Debounce on the input value only; `update` and `query` change every render.
  }, [search]);

  const hasFilters = useMemo(() => [...params.keys()].some((key) => key !== "page"), [params]);
  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Ticket queue"
        description="Unresolved tickets first, most urgent and oldest at the top."
        actions={isFetching && !isLoading ? <Loader2 className="size-4 animate-spin text-muted" /> : null}
      />

      {stats && (
        <div className="mb-6">
          <QueueStats stats={stats} onFilter={update} />
        </div>
      )}

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject, description or #ticket"
              className="pl-9"
              aria-label="Search tickets"
            />
          </div>
          <Select className="w-auto" aria-label="Status" value={query.status ?? ""} onChange={(e) => update({ status: e.target.value })}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select className="w-auto" aria-label="Category" value={query.category ?? ""} onChange={(e) => update({ category: e.target.value || null })}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </Select>
          <Select className="w-auto" aria-label="Priority" value={query.priority ?? ""} onChange={(e) => update({ priority: e.target.value || null })}>
            <option value="">All priorities</option>
            <option value="critical,high">Critical + High</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </Select>
          <Select className="w-auto" aria-label="Assignee" value={query.assignee ?? ""} onChange={(e) => update({ assignee: e.target.value || null })}>
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {team?.filter((m) => m.id !== me?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Input type="date" className="w-auto" aria-label="Created from" value={query.from ?? ""} onChange={(e) => update({ from: e.target.value || null })} />
          <Input type="date" className="w-auto" aria-label="Created to" value={query.to ?? ""} onChange={(e) => update({ to: e.target.value || null })} />
          <Select className="w-auto" aria-label="Sort" value={query.sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="urgency">Most urgent first</option>
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="recent_activity">Recent activity</option>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" icon={<X className="size-3.5" />} onClick={() => { setSearch(""); reset(); }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <Spinner label="Loading queue…" />
        ) : error || !data ? (
          <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
        ) : data.tickets.length === 0 ? (
          <EmptyState icon={<Inbox className="size-5" />} title="No tickets match" description={hasFilters ? "Try clearing some filters." : "The queue is empty — nice work."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-240 text-left text-sm">
              <thead className="border-b border-line bg-slate-50 text-xs font-medium text-muted">
                <tr>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5">Ticket</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Assignee</th>
                  <th className="px-4 py-2.5">Age</th>
                  <th className="px-4 py-2.5">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                    className={cn("cursor-pointer border-l-4 transition hover:bg-brand-50/40", PRIORITY_BORDER[ticket.priority])}
                  >
                    <td className="px-4 py-3 align-top">
                      <PriorityBadge priority={ticket.priority} />
                      <div className="mt-1"><SourceTag source={ticket.prioritySource} /></div>
                    </td>
                    <td className="max-w-md px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted tabular-nums">#{ticket.ticketNumber}</span>
                        <span className="truncate font-medium text-ink">{ticket.subject}</span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {ticket.author?.name} · {ticket.book?.title ?? "General / Account"}
                        {ticket.awaitingSupport && <span className="ml-2 font-medium text-brand-700">● Awaiting reply</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {ticket.categoryLabel ? (
                        <>
                          <div className="text-ink">{ticket.categoryLabel}</div>
                          <SourceTag source={ticket.categorySource} />
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-violet-700">
                          <Loader2 className="size-3 animate-spin" /> Classifying…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top"><StatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3 align-top text-ink">
                      {ticket.assignee ? (ticket.assignee.id === me?.id ? "You" : ticket.assignee.name) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums">
                      <span className={cn("inline-flex items-center gap-1", ticket.slaBreached ? "font-semibold text-red-600" : "text-ink")} title={ticket.slaBreached ? "First-response SLA breached" : undefined}>
                        {ticket.slaBreached && <AlarmClock className="size-3.5" />}
                        {ageOf(ticket.createdAt, now)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted">{timeAgo(ticket.lastActivityAt, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} tickets
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<ChevronLeft className="size-3.5" />} disabled={data.pagination.page <= 1} onClick={() => update({ page: String(data.pagination.page - 1) })}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => update({ page: String(data.pagination.page + 1) })}>
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
