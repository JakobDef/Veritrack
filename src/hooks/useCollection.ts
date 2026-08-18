"use client";

import { useEffect, useState } from "react";
import {
  onSnapshot,
  queryEqual,
  refEqual,
  type DocumentReference,
  type FirestoreError,
  type Query,
} from "firebase/firestore";

export type Async<T> = {
  data: T;
  loading: boolean;
  error: FirestoreError | null;
};

/**
 * Live list backed by `onSnapshot`. Unsubscribes on unmount and on query change.
 *
 * Callers build queries inline, which produces a brand new object on every
 * render. Subscribing on that object's identity would tear down and re-create
 * the listener every render, which re-renders again: an infinite loop that
 * silently burns Firestore reads. `queryEqual` compares by content instead, and
 * the swap happens in the render phase (React's documented "adjust state when
 * props change" pattern) so no effect ever has to call setState synchronously.
 */
export function useCollection<T>(query: Query<T> | null): Async<T[]> {
  const [stable, setStable] = useState<Query<T> | null>(query);
  const [state, setState] = useState<Async<T[]>>({
    data: [],
    loading: query !== null,
    error: null,
  });

  const same = query === stable || (query !== null && stable !== null && queryEqual(query, stable));
  if (!same) {
    setStable(query);
    setState({ data: [], loading: query !== null, error: null });
  }
  const active = same ? stable : query;

  useEffect(() => {
    if (!active) return;
    return onSnapshot(
      active,
      (snap) => setState({ data: snap.docs.map((doc) => doc.data()), loading: false, error: null }),
      (error) => {
        console.error("Firestore listener failed:", error);
        setState({ data: [], loading: false, error });
      },
    );
  }, [active]);

  return state;
}

/** Live single document. `data` is null while loading and when the doc is missing. */
export function useDocument<T>(ref: DocumentReference<T> | null): Async<T | null> {
  const [stable, setStable] = useState<DocumentReference<T> | null>(ref);
  const [state, setState] = useState<Async<T | null>>({
    data: null,
    loading: ref !== null,
    error: null,
  });

  const same = ref === stable || (ref !== null && stable !== null && refEqual(ref, stable));
  if (!same) {
    setStable(ref);
    setState({ data: null, loading: ref !== null, error: null });
  }
  const active = same ? stable : ref;

  useEffect(() => {
    if (!active) return;
    return onSnapshot(
      active,
      (snap) => setState({ data: snap.exists() ? snap.data() : null, loading: false, error: null }),
      (error) => {
        console.error("Firestore listener failed:", error);
        setState({ data: null, loading: false, error });
      },
    );
  }, [active]);

  return state;
}
