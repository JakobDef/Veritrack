"use client";

import { useMemo } from "react";
import { orderBy, query } from "firebase/firestore";
import { useCollection } from "./useCollection";
import { projectsCol } from "@/lib/firebase/paths";
import type { Project, ProjectStatus } from "@/types/models";

const STATUS_RANK: Record<ProjectStatus, number> = { active: 0, paused: 1, done: 2 };

/** All of the band's projects, active first, then alphabetical within a status. */
export function useProjects(bandId: string | null) {
  const q = useMemo(
    () => (bandId ? query(projectsCol(bandId), orderBy("name")) : null),
    [bandId],
  );
  const { data, loading, error } = useCollection(q);

  const projects = useMemo(
    () => [...data].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]),
    [data],
  );

  const byId = useMemo(() => {
    const map = new Map<string, Project>();
    for (const project of projects) map.set(project.id, project);
    return map;
  }, [projects]);

  return { projects, byId, loading, error };
}
