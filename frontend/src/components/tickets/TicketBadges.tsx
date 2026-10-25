import { Bot, Flame, ListChecks, UserCog } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { PRIORITY_LABELS, SOURCE_LABELS, STATUS_LABELS } from "@/lib/constants";
import type { ClassificationSource, TicketPriority, TicketStatus } from "@/types/api";

const STATUS_TONES: Record<TicketStatus, BadgeTone> = {
  open: "blue",
  in_progress: "violet",
  resolved: "green",
  closed: "slate",
};

const PRIORITY_TONES: Record<TicketPriority, BadgeTone> = {
  critical: "red",
  high: "orange",
  medium: "amber",
  low: "slate",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge
      tone={PRIORITY_TONES[priority]}
      icon={priority === "critical" ? <Flame className="size-3" /> : undefined}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

const SOURCE_ICONS = {
  ai: <Bot className="size-3" />,
  rules: <ListChecks className="size-3" />,
  admin: <UserCog className="size-3" />,
};

/** Shows who decided a category/priority: the AI, the rule-based fallback, or an admin. */
export function SourceTag({ source }: { source: ClassificationSource | null }) {
  if (!source) return null;
  return (
    <span
      title={`Set by ${SOURCE_LABELS[source]}`}
      className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted"
    >
      {SOURCE_ICONS[source]}
      {SOURCE_LABELS[source]}
    </span>
  );
}

export const PRIORITY_BORDER: Record<TicketPriority, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-400",
  medium: "border-l-amber-300",
  low: "border-l-slate-200",
};
