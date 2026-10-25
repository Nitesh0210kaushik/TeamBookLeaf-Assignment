import { AlarmClock, Bot, Flame, Inbox, UserCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AdminStats } from "@/types/api";

function Stat({
  icon,
  label,
  value,
  hint,
  tone = "default",
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "danger";
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-white p-4 text-left shadow-xs transition",
        tone === "danger" ? "border-red-200" : "border-line",
        onClick && "hover:border-brand-200 hover:bg-brand-50/40",
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", tone === "danger" ? "text-red-600" : "text-muted")}>
        {icon}
        {label}
      </div>
      <div className={cn("mt-1.5 text-2xl font-semibold tabular-nums", tone === "danger" ? "text-red-600" : "text-ink")}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </Tag>
  );
}

const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);

export function QueueStats({
  stats,
  onFilter,
}: {
  stats: AdminStats;
  onFilter: (patch: Record<string, string | null>) => void;
}) {
  const { queue, ai } = stats;
  const open = Object.values(queue.openByPriority).reduce((sum, n) => sum + n, 0);
  const urgent = (queue.openByPriority.critical ?? 0) + (queue.openByPriority.high ?? 0);
  const totalCost = ai.usage.reduce((sum, row) => sum + (row.estimatedCostUsd ?? 0), 0);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Stat
        icon={<Inbox className="size-3.5" />}
        label="Open tickets"
        value={open}
        hint={`${queue.byStatus.open ?? 0} new · ${queue.byStatus.in_progress ?? 0} in progress`}
        onClick={() => onFilter({ status: "open,in_progress", priority: null, assignee: null })}
      />
      <Stat
        icon={<Flame className="size-3.5" />}
        label="Critical + high"
        value={urgent}
        hint={`${queue.openByPriority.critical ?? 0} critical`}
        tone={queue.openByPriority.critical ? "danger" : "default"}
        onClick={() => onFilter({ status: "open,in_progress", priority: "critical,high", assignee: null })}
      />
      <Stat
        icon={<AlarmClock className="size-3.5" />}
        label="First-response SLA breached"
        value={queue.slaBreached}
        hint="No reply within target"
        tone={queue.slaBreached ? "danger" : "default"}
      />
      <Stat
        icon={<UserCheck className="size-3.5" />}
        label="Unassigned / mine"
        value={
          <>
            {queue.unassigned}
            <span className="text-base font-normal text-muted"> / {queue.assignedToMe}</span>
          </>
        }
        hint="Click to see unassigned"
        onClick={() => onFilter({ status: "open,in_progress", assignee: "unassigned", priority: null })}
      />
      <Stat
        icon={<Bot className="size-3.5" />}
        label="AI category kept by team"
        value={percent(ai.categoryAgreementRate)}
        hint={
          ai.triagedByAi
            ? `${ai.triagedByAi} AI-triaged · ${ai.repliesUsingAiDraft}/${ai.totalReplies} replies from drafts · ~$${totalCost.toFixed(2)} (${ai.usageWindowDays}d)`
            : `${ai.repliesUsingAiDraft}/${ai.totalReplies} replies used a draft`
        }
      />
    </div>
  );
}
