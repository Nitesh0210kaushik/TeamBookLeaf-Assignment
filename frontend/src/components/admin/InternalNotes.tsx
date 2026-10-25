import { Lock } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useAddNoteMutation } from "@/store/api/ticketsApi";
import type { AdminTicketDetail } from "@/types/api";

export function InternalNotes({ ticket }: { ticket: AdminTicketDetail }) {
  const [addNote, { isLoading }] = useAddNoteMutation();
  const [body, setBody] = useState("");

  const submit = async () => {
    try {
      await addNote({ id: ticket.id, body }).unwrap();
      setBody("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Card className="border-amber-200">
      <CardHeader
        title={<span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 text-amber-600" /> Internal notes</span>}
        description="Only visible to the BookLeaf team"
      />
      <div className="space-y-3 px-5 py-4">
        {ticket.notes.length === 0 && <p className="text-xs text-muted">No notes yet.</p>}
        {ticket.notes.map((note) => (
          <div key={note.id} className="rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-sm whitespace-pre-wrap text-ink">{note.body}</p>
            <p className="mt-1 text-[11px] text-amber-800">
              {note.createdBy?.name ?? "Team"} · {formatDateTime(note.createdAt)}
            </p>
          </div>
        ))}
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Add context for your teammates…"
          className="min-h-16"
          aria-label="New internal note"
        />
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={submit} loading={isLoading} disabled={!body.trim()}>
            Add note
          </Button>
        </div>
      </div>
    </Card>
  );
}
