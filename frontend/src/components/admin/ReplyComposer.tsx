import { Bot, FileText, Loader2, RefreshCw, RotateCcw, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select, Textarea } from "@/components/ui/Field";
import { AI_FALLBACK_REASONS, KB_SECTION_LABELS } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { useGetDraftQuery, useRegenerateDraftMutation, useReplyAsAdminMutation } from "@/store/api/ticketsApi";
import type { AdminTicketDetail, TicketStatus } from "@/types/api";

/**
 * Reply editor pre-filled with the AI draft. The admin always reviews and edits before sending;
 * the reply is flagged `aiAssisted` when it started from a draft (for adoption metrics).
 */
export function ReplyComposer({ ticket }: { ticket: AdminTicketDetail }) {
  // Only draft automatically when the author is waiting on us — saves calls on tickets we already answered.
  const [wantDraft, setWantDraft] = useState(ticket.awaitingSupport);
  const draftQuery = useGetDraftQuery(ticket.id, { skip: !wantDraft || ticket.status === "closed" });
  const [regenerate, { isLoading: regenerating }] = useRegenerateDraftMutation();
  const [sendReply, { isLoading: sending }] = useReplyAsAdminMutation();

  const [body, setBody] = useState("");
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(null);
  const [consumedDraftId, setConsumedDraftId] = useState<string | null>(null);
  const [edited, setEdited] = useState(false);
  const [nextStatus, setNextStatus] = useState<TicketStatus>("in_progress");

  const draft = draftQuery.data?.draft;

  // Load a new draft into the editor unless the admin is mid-edit or already sent it.
  useEffect(() => {
    if (!draft || draft.id === consumedDraftId || draft.id === loadedDraftId) return;
    if (body.trim() && edited) return;
    setBody(draft.content);
    setLoadedDraftId(draft.id);
    setEdited(false);
    // Intentionally keyed on the draft id only: react to a new draft arriving, not to typing.
  }, [draft?.id]);

  useEffect(() => setWantDraft(ticket.awaitingSupport), [ticket.awaitingSupport]);

  const send = async () => {
    try {
      await sendReply({ id: ticket.id, body, status: nextStatus, aiAssisted: loadedDraftId !== null }).unwrap();
      toast.success(nextStatus === "resolved" ? "Reply sent and ticket resolved" : "Reply sent to the author");
      setConsumedDraftId(loadedDraftId);
      setLoadedDraftId(null);
      setBody("");
      setEdited(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  if (ticket.status === "closed") {
    return (
      <Card className="px-5 py-4 text-sm text-muted">
        This ticket is closed. Reopen it from the status menu to reply.
      </Card>
    );
  }

  const drafting = draftQuery.isFetching || regenerating;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Reply to author"
        description="The author sees this reply immediately on their ticket."
        action={
          wantDraft ? (
            <Button
              variant="secondary"
              size="sm"
              loading={regenerating}
              icon={<RefreshCw className="size-3.5" />}
              onClick={() =>
                regenerate(ticket.id)
                  .unwrap()
                  .then(() => setEdited(false))
                  .catch((error) => toast.error(getErrorMessage(error)))
              }
              disabled={drafting}
            >
              Regenerate draft
            </Button>
          ) : (
            <Button variant="ai" size="sm" icon={<Sparkles className="size-3.5" />} onClick={() => setWantDraft(true)}>
              Draft with AI
            </Button>
          )
        }
      />

      {wantDraft && (
        <div className="border-b border-line bg-violet-50/50 px-5 py-2.5 text-xs">
          {drafting ? (
            <span className="inline-flex items-center gap-1.5 text-violet-800">
              <Loader2 className="size-3.5 animate-spin" />
              Drafting a reply from the knowledge base and this author's account…
            </span>
          ) : draft ? (
            <div className="flex flex-wrap items-center gap-2">
              {draft.source === "ai" ? (
                <Badge tone="violet" icon={<Bot className="size-3" />}>AI draft · {draft.model}</Badge>
              ) : (
                <Badge tone="amber" icon={<FileText className="size-3" />}>
                  Template · {AI_FALLBACK_REASONS[draft.fallbackReason ?? ""] ?? "AI unavailable"}
                </Badge>
              )}
              {draft.knowledgeSections.length > 0 && (
                <span className="text-muted">
                  Grounded in: {draft.knowledgeSections.map((key) => KB_SECTION_LABELS[key] ?? key).join(", ")}
                </span>
              )}
              <span className="ml-auto text-muted">Review and edit before sending.</span>
            </div>
          ) : draftQuery.error ? (
            <span className="text-red-700">{getErrorMessage(draftQuery.error)} You can still write the reply manually.</span>
          ) : null}
        </div>
      )}

      <div className="space-y-3 p-5">
        <Textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setEdited(true);
          }}
          rows={12}
          maxLength={5000}
          placeholder={drafting ? "Your draft will appear here…" : "Write your reply…"}
          aria-label="Reply"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {draft && edited && body !== draft.content && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw className="size-3.5" />}
                onClick={() => {
                  setBody(draft.content);
                  setLoadedDraftId(draft.id);
                  setEdited(false);
                }}
              >
                Restore draft
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as TicketStatus)}
              className="h-10 w-auto"
              aria-label="Status after sending"
            >
              <option value="in_progress">Keep In Progress</option>
              <option value="resolved">Mark Resolved</option>
            </Select>
            <Button onClick={send} loading={sending} disabled={!body.trim() || drafting} icon={<Send className="size-4" />}>
              Send reply
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
