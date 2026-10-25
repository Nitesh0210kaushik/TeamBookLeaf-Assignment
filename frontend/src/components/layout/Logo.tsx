import { cn } from "@/lib/cn";

export function Logo({ subtitle, inverted }: { subtitle?: string; inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" fill={inverted ? "#ffffff" : "#1b5276"} />
        <path d="M9 22c0-7 5-12 14-13-1 8-6 13-14 13Z" fill={inverted ? "#2f8f5b" : "#9fd3b4"} />
        <path
          d="M9 23c3-4 6-7 10-9"
          stroke={inverted ? "#ffffff" : "#1b5276"}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <div className="leading-tight">
        <div
          className={cn(
            "font-serif text-[15px] font-semibold",
            inverted ? "text-white" : "text-ink",
          )}
        >
          BookLeaf
        </div>
        {subtitle && (
          <div
            className={cn(
              "text-[11px] font-medium tracking-wide whitespace-nowrap uppercase",
              inverted ? "text-brand-100" : "text-muted",
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
