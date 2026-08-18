import {
  DELETED_PROJECT_LABEL,
  UNASSIGNED_PROJECT_LABEL,
} from "@/types/models";

/**
 * Display name for a time entry's project.
 *
 * Null id is unassigned ("Ohne Projekt"). A leftover id whose project was
 * deleted is "Gelöschtes Projekt". Those two must stay distinct.
 */
export function timeEntryProjectName(
  projectId: string | null,
  project: { name: string } | undefined,
): string {
  if (projectId == null) return UNASSIGNED_PROJECT_LABEL;
  if (!project) return DELETED_PROJECT_LABEL;
  return project.name;
}
