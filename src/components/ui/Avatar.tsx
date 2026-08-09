/* eslint-disable @next/next/no-img-element -- Avatars come from arbitrary
   remote hosts (Google photoURL); next/image would need a host allowlist we
   cannot know ahead of time. */
import { cn } from "@/lib/cn";

const sizes = {
  xs: "size-5 text-[9px]",
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
} as const;

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

export function Avatar({
  name,
  src,
  color,
  size = "md",
  className,
  title,
}: {
  name?: string | null;
  src?: string | null;
  /** Functional-role color, drawn as a ring so the role reads at a glance. */
  color?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  title?: string;
}) {
  const ring = color
    ? { boxShadow: `0 0 0 2px var(--vt-surface), 0 0 0 3.5px ${color}` }
    : undefined;

  return (
    <span
      title={title ?? name ?? undefined}
      style={ring}
      className={cn(
        "bg-surface-2 text-muted inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold select-none",
        sizes[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 3,
  size = "sm",
}: {
  people: { name?: string | null; src?: string | null; color?: string | null }[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.src} color={p.color} size={size} />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "bg-surface-2 text-muted border-surface inline-flex items-center justify-center rounded-full border font-semibold",
            sizes[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}
