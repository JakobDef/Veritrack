"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * localStorage as a React external store.
 *
 * `useSyncExternalStore` is the right primitive here rather than "read it in an
 * effect and setState": the server snapshot is `null`, so the first client
 * render matches the server HTML exactly and there is no hydration mismatch,
 * and React re-renders with the real value immediately afterwards. It also
 * keeps multiple components reading the same key in sync, including across
 * browser tabs via the `storage` event.
 */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  // Fires when another tab writes the same key.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private mode or storage disabled: behave as if nothing was stored.
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Non-fatal: the value simply will not survive a reload.
  }
  emit();
}

export function useLocalStorage(key: string | null) {
  const getSnapshot = useCallback(() => (key ? read(key) : null), [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setValue = useCallback(
    (next: string | null) => {
      if (key) write(key, next);
    },
    [key],
  );

  return useMemo(() => [value, setValue] as const, [value, setValue]);
}
