import { ArrowLeft, Lock, Paperclip, Send } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { MessageThread } from "@/components/tickets/MessageThread";
import { StatusBadge } from "@/components/tickets/TicketBadges";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { ErrorState, Spinner } from "@/components/ui/States";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useFallbackPolling } from "@/hooks/useRealtime";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatFileSize } from "@/lib/format";
import { useGetMyTicketQuery, useReplyAsAuthorMutation } from "@/store/api/ticketsApi";

export function TicketDetailPage() {
  const { ticketId = "" } = useParams();
  const pollingInterval = useFallbackPolling();
  const { data: ticket, isLoading, error, refetch } = useGetMyTicketQuery(ticketId, { pollingInterval });
  const [reply, { isLoading: sending }] = useReplyAsAuthorMutation();
  const [body, setBody] = useState("");
  usePageTitle(ticket ? `#${ticket.ticketNumber} ${ticket.subject}` : "Ticket");

  if (isLoading) return <Spinner label="Loading ticket…" />;
  if (error || !ticket) return <ErrorState message={getErrorMessage(error, "Ticket not found.")} onRetry={refetch} />;

  const send = async () => {
    try {
      await reply({ id: ticket.id, body }).unwrap();
      setBody("");
      toast.success(ticket.status === "resolved" ? "Reply sent — ticket reopened" : "Reply sent");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All tickets
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">Ticket #{ticket.ticketNumber}</p>
          <h1 className="font-serif text-2xl font-semibold text-ink">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted">
            {ticket.book?.title ?? "General / Account Level"}
            {ticket.categoryLabel && <> · {ticket.categoryLabel}</>} · opened {formatDateTime(ticket.createdAt)}
          </p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <Card className="mb-6">
        <CardHeader title="Your query" />
        <div className="px-5 py-4">
          <p className="text-sm whitespace-pre-wrap text-ink">{ticket.description}</p>
          {ticket.attachments.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {ticket.attachments.map((file) => (
                <li key={file.fileName} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs text-muted">
                  <Paperclip className="size-3" /> {file.fileName} · {formatFileSize(file.fileSize)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Conversation" description="Replies from the BookLeaf team appear here instantly." />
        <div className="px-5 py-5">
          <MessageThread
            emptyText="Our team will reply here soon. You don't need to refresh this page."
            items={ticket.messages.map((message) => ({
              id: message.id,
              side: message.senderRole === "admin" ? "support" : "author",
              name: message.senderRole === "admin" ? message.senderName : "You",
              body: message.body,
              createdAt: message.createdAt,
            }))}
          />
        </div>

        <div className="border-t border-line px-5 py-4">
          {ticket.status === "closed" ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Lock className="size-4" /> This ticket is closed.{" "}
              <Link to="/tickets/new" className="font-medium text-brand-700 hover:underline">Open a new query</Link> if you need more help.
            </p>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
                maxLength={5000}
                placeholder={ticket.status === "resolved" ? "Still need help? Replying will reopen this ticket." : "Add more details or reply to our team…"}
                aria-label="Your reply"
              />
              <div className="flex justify-end">
                <Button onClick={send} loading={sending} disabled={!body.trim()} icon={<Send className="size-4" />}>
                  Send reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
