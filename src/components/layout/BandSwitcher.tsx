"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useBand } from "@/providers/BandProvider";
import { useDocument } from "@/hooks/useCollection";
import { bandDoc } from "@/lib/firebase/paths";
import { cn } from "@/lib/cn";

/** One row per band id, each with its own live document subscription. */
function BandOption({
  bandId,
  active,
  onSelect,
}: {
  bandId: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { data: band } = useDocument(bandDoc(bandId));
  return (
    <button
      type="button"
      onClick={onSelect}
      className="hover:bg-surface-2 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors"
    >
      <span className="flex-1 truncate">{band?.name ?? "…"}</span>
      {active ? <Check className="text-accent size-3.5 shrink-0" aria-hidden /> : null}
    </button>
  );
}

export function BandSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { band, bandIds, activeBandId, setActiveBandId } = useBand();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "border-border hover:bg-surface-2 hover:border-border-strong flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="bg-accent text-accent-fg font-display grid size-6 shrink-0 place-items-center rounded-sm text-xs font-bold">
          {(band?.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {band?.name ?? "Keine Band"}
            </span>
            <ChevronsUpDown className="text-faint size-3.5 shrink-0" aria-hidden />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="border-border bg-surface animate-fade-up absolute bottom-full left-0 z-50 mb-1 w-56 rounded-md border p-1 shadow-lg"
        >
          <p className="text-faint px-2 py-1 text-[11px] font-semibold tracking-wider uppercase">
            Bands
          </p>
          {bandIds.map((id) => (
            <BandOption
              key={id}
              bandId={id}
              active={id === activeBandId}
              onSelect={() => {
                setActiveBandId(id);
                setOpen(false);
              }}
            />
          ))}
          <div className="bg-border my-1 h-px" />
          <Link
            href="/bands"
            onClick={() => setOpen(false)}
            className="hover:bg-surface-2 flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors"
          >
            <Plus className="size-3.5" aria-hidden />
            Band anlegen oder beitreten
          </Link>
        </div>
      ) : null}
    </div>
  );
}
