import { Bot, Inbox } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { useGetStatsQuery } from "@/store/api/adminApi";

const NAV = [
  {
    to: "/admin/tickets",
    label: "Ticket queue",
    icon: <Inbox className="size-4" />,
  },
];

/** Tells the ops team up-front whether AI assistance is live or the app is in fallback mode. */
function AiStatusPill() {
  const { data } = useGetStatsQuery();
  const status = data?.ai.status;
  if (!status) return null;

  if (status.available) {
    return (
      <Badge tone="violet" icon={<Bot className="size-3" />} className="hidden lg:inline-flex">
        AI assist on
      </Badge>
    );
  }

  return (
    <span
      title={
        status.enabled
          ? "AI assist is paused after repeated errors and will resume automatically. Tickets are classified from keywords and replies start from policy templates meanwhile."
          : "AI assist is turned off. Tickets are classified from keywords and replies start from policy templates."
      }
    >
      <Badge tone="amber" icon={<Bot className="size-3" />} className="hidden lg:inline-flex">
        {status.enabled ? "AI assist paused" : "AI assist off"}
      </Badge>
    </span>
  );
}

export function AdminLayout() {
  return <AppShell subtitle="Support Operations" nav={NAV} headerExtra={<AiStatusPill />} wide />;
}
