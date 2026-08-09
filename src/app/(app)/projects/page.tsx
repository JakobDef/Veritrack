"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useProjects } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/types/models";
import { cn } from "@/lib/cn";

type Filter = "all" | ProjectStatus;

function ProjectsView() {
  const { user } = useAuth();
  const { activeBandId, can } = useBand();
  const { projects, loading } = useProjects(activeBandId);
  const { entries } = useTimeEntries({ bandId: activeBandId });
  const searchParams = useSearchParams();

  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(searchParams.get("new") === "1");
  const [nowMs] = useState(() => Date.now());

  // Total tracked minutes per project, from the band's entries.
  const minutesByProject = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of entries) {
      totals.set(entry.projectId, (totals.get(entry.projectId) ?? 0) + (entry.duration ?? 0));
    }
    return totals;
  }, [entries]);

  const visible = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => p.status === filter)),
    [projects, filter],
  );

  const filters: [Filter, string][] = [
    ["all", "Alle"],
    ["active", PROJECT_STATUS_LABELS.active],
    ["paused", PROJECT_STATUS_LABELS.paused],
    ["done", PROJECT_STATUS_LABELS.done],
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Projekte</h1>
          <p className="text-muted text-sm">
            Alles, worauf ihr Zeit bucht: Alben, Touren, Proben, Booking.
          </p>
        </div>
        {can.createProject ? (
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" aria-hidden />
            Neues Projekt
          </Button>
        ) : null}
      </header>

      {projects.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.map(([value, label]) => {
            const count =
              value === "all"
                ? projects.length
                : projects.filter((p) => p.status === value).length;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === value
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted hover:text-text hover:border-border-strong",
                )}
              >
                {label}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Noch keine Projekte"
          description={
            can.createProject
              ? "Lege das erste an. Danach reicht auf dem Dashboard ein Klick, um Zeit darauf zu tracken."
              : "Sobald ein Admin ein Projekt anlegt, taucht es hier auf."
          }
          action={
            can.createProject ? (
              <Button variant="primary" onClick={() => setFormOpen(true)}>
                <Plus className="size-4" aria-hidden />
                Projekt anlegen
              </Button>
            ) : undefined
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          compact
          icon={FolderKanban}
          title="Nichts in diesem Status"
          description="Wechsle den Filter, um andere Projekte zu sehen."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              trackedMinutes={minutesByProject.get(project.id) ?? 0}
              nowMs={nowMs}
            />
          ))}
        </div>
      )}

      {activeBandId && user ? (
        <ProjectForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          bandId={activeBandId}
          userId={user.uid}
          project={null}
        />
      ) : null}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ProjectsView />
    </Suspense>
  );
}
