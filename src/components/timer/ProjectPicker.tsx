"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { roleColorVar } from "@/lib/roleColors";
import { cn } from "@/lib/cn";
import { UNASSIGNED_PROJECT_PICKER_LABEL, type Project } from "@/types/models";

const NONE_INDEX = 0;

/**
 * Listbox rather than a native <select> so each project can carry its color dot
 * and status. Implements the ARIA listbox keyboard contract by hand: arrows to
 * move, Home/End to jump, Enter/Space to choose, Escape to dismiss.
 *
 * Index 0 is always "Kein Projekt" (`onChange(null)`). Real projects start at 1.
 */
export function ProjectPicker({
  projects,
  value,
  onChange,
  disabled = false,
  size = "md",
  placeholder = "Projekt wählen",
  className,
}: {
  projects: Project[];
  value: string | null;
  onChange: (projectId: string | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const lastIndex = projects.length;
  const selected = useMemo(
    () => (value ? (projects.find((project) => project.id === value) ?? null) : null),
    [projects, value],
  );
  const noneSelected = value === null;

  function indexForValue(): number {
    if (value === null) return NONE_INDEX;
    const index = projects.findIndex((project) => project.id === value);
    return index >= 0 ? index + 1 : NONE_INDEX;
  }

  // Opening highlights the current selection. Done in the handler rather than an
  // effect so the list never paints with the wrong row highlighted first.
  function openList() {
    setActiveIndex(indexForValue());
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [open, activeIndex]);

  function choose(index: number) {
    if (index === NONE_INDEX) {
      onChange(null);
      setOpen(false);
      return;
    }
    const project = projects[index - 1];
    if (!project) return;
    onChange(project.id);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, lastIndex));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(lastIndex);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
    }
  }

  const heights = { sm: "h-8 text-[13px]", md: "h-11 text-sm" };
  const noneDot = "var(--vt-muted)";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        className={cn(
          "border-border bg-surface hover:border-border-strong flex w-full items-center gap-2 rounded-md border px-3 transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-60",
          heights[size],
        )}
      >
        {noneSelected ? (
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: noneDot }} />
        ) : selected ? (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: roleColorVar(selected.color) }}
          />
        ) : null}
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            !noneSelected && !selected && "text-faint",
          )}
        >
          {noneSelected
            ? UNASSIGNED_PROJECT_PICKER_LABEL
            : (selected?.name ?? placeholder)}
        </span>
        <ChevronDown className="text-faint size-4 shrink-0" aria-hidden />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Projekt"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="border-border bg-surface animate-fade-up absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border p-1 shadow-lg"
        >
          <li
            role="option"
            aria-selected={noneSelected}
            data-index={NONE_INDEX}
            onMouseEnter={() => setActiveIndex(NONE_INDEX)}
            onClick={() => choose(NONE_INDEX)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
              activeIndex === NONE_INDEX && "bg-surface-2",
            )}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: noneDot }} />
            <span className="text-muted min-w-0 flex-1 truncate">{UNASSIGNED_PROJECT_PICKER_LABEL}</span>
            {noneSelected ? <Check className="text-accent size-3.5 shrink-0" aria-hidden /> : null}
          </li>
          {projects.map((project, index) => {
            const listIndex = index + 1;
            const isSelected = project.id === value;
            return (
              <li
                key={project.id}
                role="option"
                aria-selected={isSelected}
                data-index={listIndex}
                onMouseEnter={() => setActiveIndex(listIndex)}
                onClick={() => choose(listIndex)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  listIndex === activeIndex && "bg-surface-2",
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: roleColorVar(project.color) }}
                />
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {project.status !== "active" ? (
                  <span className="text-faint shrink-0 text-[11px]">
                    {project.status === "paused" ? "pausiert" : "fertig"}
                  </span>
                ) : null}
                {isSelected ? <Check className="text-accent size-3.5 shrink-0" aria-hidden /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
