import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

export function StatNugget({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  /** Optional color for the icon chip, e.g. a project color. */
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("border-border bg-surface flex items-center gap-3 rounded-lg border p-4", className)}>
      {Icon ? (
        <span
          className="grid size-9 shrink-0 place-items-center rounded-md"
          style={{
            backgroundColor: `color-mix(in oklab, ${accent ?? "var(--vt-accent)"} 14%, transparent)`,
            color: accent ?? "var(--vt-accent)",
          }}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-muted text-xs font-medium">{label}</p>
        <p className="tabular font-display truncate text-xl font-semibold">{value}</p>
        {hint ? <p className="text-faint truncate text-xs">{hint}</p> : null}
      </div>
    </div>
  );
}
