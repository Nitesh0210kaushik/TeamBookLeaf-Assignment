import { Bot, Loader2, RefreshCw, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import {
  AI_FALLBACK_REASONS,
  CATEGORIES,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/format";
import { useGetTeamQuery } from "@/store/api/adminApi";
import { useMeQuery } from "@/store/api/authApi";
import { useRerunTriageMutation, useUpdateTicketMutation } from "@/store/api/ticketsApi";
import type { AdminTicketDetail } from "@/types/api";
import { SourceTag } from "../tickets/TicketBadges";

function Row({
  label,
  children,
  footer,
}: {
  label: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted">{label}</div>
      {children}
      {footer}
    </div>
  );
}

export function TicketProperties({ ticket }: { ticket: AdminTicketDetail }) {
  const { data: me } = useMeQuery();
  const { data: team } = useGetTeamQuery();
  const [update, { isLoading: saving }] = useUpdateTicketMutation();
  const [rerunTriage, { isLoading: triaging }] = useRerunTriageMutation();
  const { triage } = ticket;

  const save = async (patch: Parameters<typeof update>[0], message: string) => {
    try {
      await update(patch).unwrap();
      toast.success(message);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const suggestionNote = (kind: "category" | "priority") => {
    const suggested = kind === "category" ? triage.suggestedCategory : triage.suggestedPriority;
    const current = kind === "category" ? ticket.category : ticket.priority;
    if (!suggested || suggested === current) return null;
    const label =
      kind === "category"
        ? CATEGORY_LABELS[triage.suggestedCategory!]
        : PRIORITY_LABELS[triage.suggestedPriority!];
    return <p className="text-xs text-muted">Overridden · AI suggested {label}</p>;
  };

  return (
    <Card>
      <CardHeader
        title="Ticket details"
        action={saving ? <Loader2 className="size-4 animate-spin text-muted" /> : null}
      />
      <div className="space-y-4 px-5 py-4">
        <Row label="Status">
          <Select
            value={ticket.status}
            onChange={(e) =>
              save(
                {
                  id: ticket.id,
                  status: e.target.value as AdminTicketDetail["status"],
                },
                "Status updated",
              )
            }
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Row>

        <Row label="Priority" footer={suggestionNote("priority")}>
          <div className="flex items-center gap-2">
            <Select
              value={ticket.priority}
              onChange={(e) =>
                save(
                  {
                    id: ticket.id,
                    priority: e.target.value as AdminTicketDetail["priority"],
                  },
                  "Priority updated",
                )
              }
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
            <SourceTag source={ticket.prioritySource} />
          </div>
        </Row>

        <Row label="Category" footer={suggestionNote("category")}>
          <div className="flex items-center gap-2">
            <Select
              value={ticket.category ?? ""}
              onChange={(e) =>
                save(
                  {
                    id: ticket.id,
                    category: e.target.value as AdminTicketDetail["category"] & string,
                  },
                  "Category updated",
                )
              }
            >
              {!ticket.category && <option value="">Classifying…</option>}
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
            <SourceTag source={ticket.categorySource} />
          </div>
        </Row>

        <Row label="Assignee">
          <div className="flex items-center gap-2">
            <Select
              value={ticket.assignee?.id ?? ""}
              onChange={(e) =>
                save({ id: ticket.id, assigneeId: e.target.value || null }, "Assignee updated")
              }
            >
              <option value="">Unassigned</option>
              {team?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.id === me?.id ? `${member.name} (you)` : member.name}
                </option>
              ))}
            </Select>
            {ticket.assignee?.id !== me?.id && me && (
              <Button
                variant="secondary"
                size="sm"
                icon={<UserPlus className="size-3.5" />}
                onClick={() => save({ id: ticket.id, assigneeId: me.id }, "Assigned to you")}
              >
                Me
              </Button>
            )}
          </div>
        </Row>

        <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-900">
              <Bot className="size-3.5" /> AI triage
            </span>
            {triage.status === "pending" ? (
              <Badge tone="violet" icon={<Loader2 className="size-3 animate-spin" />}>
                Running
              </Badge>
            ) : triage.status === "completed" ? (
              <Badge tone="violet">
                {triage.confidence !== null
                  ? `${Math.round(triage.confidence * 100)}% confident`
                  : "Done"}
              </Badge>
            ) : (
              <Badge tone="amber">Keyword rules</Badge>
            )}
          </div>
          {triage.reasoning && (
            <p className="mt-2 text-xs leading-relaxed text-violet-950/80">{triage.reasoning}</p>
          )}
          {triage.status === "fallback" &&
            triage.fallbackReason &&
            triage.fallbackReason !== "seed" && (
              <p className="mt-1 text-xs text-amber-800">
                {AI_FALLBACK_REASONS[triage.fallbackReason] ?? triage.fallbackReason}
              </p>
            )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] text-muted">
            <span
              className="min-w-0 truncate"
              title={triage.model ? `Classified by ${triage.model}` : undefined}
            >
              Updated {timeAgo(triage.completedAt)}
            </span>
            <button
              type="button"
              disabled={triaging}
              onClick={() =>
                rerunTriage(ticket.id)
                  .unwrap()
                  .then(() => toast.success("Classification refreshed"))
                  .catch((error) => toast.error(getErrorMessage(error)))
              }
              className="inline-flex shrink-0 items-center gap-1 font-medium whitespace-nowrap text-violet-700 hover:underline disabled:opacity-50"
            >
              <RefreshCw className={triaging ? "size-3 animate-spin" : "size-3"} /> Run AI triage
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
