import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "slate" | "blue" | "violet" | "green" | "amber" | "orange" | "red" | "brand";

const TONES: Record<BadgeTone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
};

export function Badge({
  tone = "slate",
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
