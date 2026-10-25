import { Card, CardHeader } from "@/components/ui/Card";
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { AdminTicketDetail, TicketCategory, TicketPriority, TicketStatus } from "@/types/api";

type TicketEvent = AdminTicketDetail["events"][number];

function describe(event: TicketEvent) {
  const who = event.actor?.name ?? "System";
  switch (event.type) {
    case "created":
      return `${who} opened the ticket`;
    case "triaged": {
      const [category, priority] = (event.to ?? "").split(" / ");
      const source = event.meta?.source === "ai" ? "AI" : "Keyword rules";
      return `${source} classified the ticket as ${CATEGORY_LABELS[category as TicketCategory] ?? category} · ${PRIORITY_LABELS[priority as TicketPriority] ?? priority}`;
    }
    case "status_changed":
      return `${who} changed status ${STATUS_LABELS[event.from as TicketStatus] ?? event.from} → ${STATUS_LABELS[event.to as TicketStatus] ?? event.to}`;
    case "priority_changed":
      return `${who} changed priority ${PRIORITY_LABELS[event.from as TicketPriority] ?? event.from} → ${PRIORITY_LABELS[event.to as TicketPriority] ?? event.to}`;
    case "category_changed":
      return `${who} changed category to ${event.to}`;
    case "assigned":
      return event.to === "Unassigned"
        ? `${who} unassigned the ticket`
        : `${who} assigned to ${event.to}`;
    case "admin_replied":
      return `${who} replied${event.meta?.aiAssisted ? " (from AI draft)" : ""}`;
    case "author_replied":
      return `${who} replied`;
    case "note_added":
      return `${who} added an internal note`;
  }
}

export function ActivityTimeline({ events }: { events: AdminTicketDetail["events"] }) {
  return (
    <Card>
      <CardHeader title="Activity" />
      <ol className="space-y-3 px-5 py-4">
        {[...events].reverse().map((event) => (
          <li key={event.id} className="flex gap-2.5 text-xs">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-slate-300" />
            <div>
              <p className="text-ink">{describe(event)}</p>
              <p className="text-muted">{timeAgo(event.createdAt)}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
