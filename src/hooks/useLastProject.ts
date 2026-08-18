"use client";

import { useCallback } from "react";
import { UNASSIGNED_PROJECT_KEY } from "@/types/models";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Remembers the project a user last tracked, per band, including "none".
 *
 * `undefined` means nothing is stored yet (first visit). `null` means the user
 * last tracked unassigned. A string is a real project id. "Kein Projekt" is
 * persisted as `UNASSIGNED_PROJECT_KEY` so a reload does not fall back to the
 * first project.
 */
export function useLastProject(bandId: string | null) {
  const [stored, setValue] = useLocalStorage(
    bandId ? `veritrack:lastProject:${bandId}` : null,
  );

  const lastProjectId: string | null | undefined =
    stored === null
      ? undefined
      : stored === UNASSIGNED_PROJECT_KEY
        ? null
        : stored;

  const remember = useCallback(
    (projectId: string | null) => {
      setValue(projectId === null ? UNASSIGNED_PROJECT_KEY : projectId);
    },
    [setValue],
  );

  return { lastProjectId, remember };
}
