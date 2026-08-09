"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Remembers the project a user last tracked, per band.
 *
 * This is what turns starting a timer into a genuine single click: the common
 * case is "same project as last time", so the picker comes back pre-filled and
 * the user only presses Start.
 */
export function useLastProject(bandId: string | null) {
  const [lastProjectId, setValue] = useLocalStorage(
    bandId ? `veritrack:lastProject:${bandId}` : null,
  );

  const remember = useCallback((projectId: string | null) => setValue(projectId), [setValue]);

  return { lastProjectId, remember };
}
