import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";

export type ThreadItem = {
  id: string;
  side: "author" | "support";
  name: string;
  body: string;
  createdAt: string;
  tag?: ReactNode;
};

function initials(name: string) {
  return name
    .replace(/^BookLeaf Support · /, "")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Conversation view shared by the author and admin portals. */
export function MessageThread({ items, emptyText }: { items: ThreadItem[]; emptyText?: string }) {
  if (!items.length) {
    return <p className="py-6 text-center text-sm text-muted">{emptyText ?? "No replies yet."}</p>;
  }

  return (
    <ol className="space-y-5">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              item.side === "support" ? "bg-brand-700 text-white" : "bg-slate-200 text-slate-700",
            )}
            aria-hidden
          >
            {item.side === "support" ? "BL" : initials(item.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-semibold text-ink">{item.name}</span>
              {item.tag}
              <span className="text-xs text-muted">{formatDateTime(item.createdAt)}</span>
            </div>
            <div
              className={cn(
                "mt-1.5 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap text-ink",
                item.side === "support" ? "border border-brand-100 bg-brand-50/60" : "border border-line bg-white",
              )}
            >
              {item.body}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
