"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { roleColorVar } from "@/lib/roleColors";
import { cn } from "@/lib/cn";
import type { Project } from "@/types/models";

/**
 * Listbox rather than a native <select> so each project can carry its color dot
 * and status. Implements the ARIA listbox keyboard contract by hand: arrows to
 * move, Home/End to jump, Enter/Space to choose, Escape to dismiss.
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
  onChange: (projectId: string) => void;
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

  const selected = useMemo(
    () => projects.find((project) => project.id === value) ?? null,
    [projects, value],
  );

  // Opening highlights the current selection. Done in the handler rather than an
  // effect so the list never paints with the wrong row highlighted first.
  function openList() {
    const index = projects.findIndex((project) => project.id === value);
    setActiveIndex(index >= 0 ? index : 0);
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
    const project = projects[index];
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
        setActiveIndex((i) => Math.min(i + 1, projects.length - 1));
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
        setActiveIndex(projects.length - 1);
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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled || projects.length === 0}
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
        {selected ? (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: roleColorVar(selected.color) }}
          />
        ) : null}
        <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-faint")}>
          {selected?.name ?? placeholder}
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
          {projects.map((project, index) => {
            const isSelected = project.id === value;
            return (
              <li
                key={project.id}
                role="option"
                aria-selected={isSelected}
                data-index={index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(index)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                  index === activeIndex && "bg-surface-2",
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
