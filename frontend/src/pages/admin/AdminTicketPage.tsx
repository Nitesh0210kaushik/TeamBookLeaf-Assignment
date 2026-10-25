import { AlarmClock, ArrowLeft, Bot, Paperclip } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { AuthorContext } from "@/components/admin/AuthorContext";
import { InternalNotes } from "@/components/admin/InternalNotes";
import { ReplyComposer } from "@/components/admin/ReplyComposer";
import { TicketProperties } from "@/components/admin/TicketProperties";
import { MessageThread } from "@/components/tickets/MessageThread";
import { PriorityBadge, StatusBadge } from "@/components/tickets/TicketBadges";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, Spinner } from "@/components/ui/States";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useFallbackPolling } from "@/hooks/useRealtime";
import { getErrorMessage } from "@/lib/errors";
import { ageOf, formatDateTime, formatFileSize } from "@/lib/format";
import { useGetAdminTicketQuery } from "@/store/api/ticketsApi";

export function AdminTicketPage() {
  const { ticketId = "" } = useParams();
  const pollingInterval = useFallbackPolling();
  const { data: ticket, isLoading, error, refetch } = useGetAdminTicketQuery(ticketId, { pollingInterval });
  usePageTitle(ticket ? `#${ticket.ticketNumber} ${ticket.subject}` : "Ticket");

  if (isLoading) return <Spinner label="Loading ticket…" />;
  if (error || !ticket) return <ErrorState message={getErrorMessage(error, "Ticket not found.")} onRetry={refetch} />;

  return (
    <>
      <Link to="/admin/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to queue
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">#{ticket.ticketNumber}</span>
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            {ticket.categoryLabel && <Badge tone="brand">{ticket.categoryLabel}</Badge>}
            {ticket.slaBreached && (
              <Badge tone="red" icon={<AlarmClock className="size-3" />}>SLA breached · {ageOf(ticket.createdAt)} old</Badge>
            )}
          </div>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-ink">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted">
            {ticket.author?.name} · {ticket.book?.title ?? "General / Account Level"} · opened {formatDateTime(ticket.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Conversation" description={`${ticket.messageCount} repl${ticket.messageCount === 1 ? "y" : "ies"} after the original query`} />
            <div className="space-y-5 px-5 py-5">
              <MessageThread
                items={[
                  {
                    id: "original",
                    side: "author",
                    name: ticket.author?.name ?? "Author",
                    body: ticket.description,
                    createdAt: ticket.createdAt,
                    tag: <Badge tone="slate">Original query</Badge>,
                  },
                  ...ticket.messages.map((message) => ({
                    id: message.id,
                    side: message.senderRole === "admin" ? ("support" as const) : ("author" as const),
                    name: message.senderRole === "admin" ? (message.sender?.name ?? "Support") : (ticket.author?.name ?? "Author"),
                    body: message.body,
                    createdAt: message.createdAt,
                    tag: message.aiAssisted ? <Badge tone="violet" icon={<Bot className="size-3" />}>From AI draft</Badge> : undefined,
                  })),
                ]}
              />
              {ticket.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-11">
                  {ticket.attachments.map((file) => (
                    <span key={file.fileName} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-muted">
                      <Paperclip className="size-3" /> {file.fileName} · {formatFileSize(file.fileSize)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Remount per ticket so editor state never leaks between tickets. */}
          <ReplyComposer key={ticket.id} ticket={ticket} />
          <InternalNotes ticket={ticket} />
          <ActivityTimeline events={ticket.events} />
        </div>

        {/* Decisions and context sit beside the conversation; on phones they follow it. */}
        <aside className="space-y-6">
          <TicketProperties ticket={ticket} />
          <AuthorContext ticket={ticket} />
        </aside>
      </div>
    </>
  );
}
