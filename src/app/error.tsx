"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Veritrack error boundary:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-danger-soft text-danger grid size-12 place-items-center rounded-full">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Da ist etwas schiefgelaufen</h1>
        <p className="text-muted max-w-md text-sm">
          Die Seite konnte nicht geladen werden. Wenn das bleibt, prüfe, ob der Firebase-Emulator
          läuft.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="bg-accent text-accent-fg hover:bg-accent-hover h-10 rounded-md px-4 text-sm font-medium transition-colors"
      >
        Nochmal versuchen
      </button>
      {error.digest ? <p className="text-faint font-mono text-xs">{error.digest}</p> : null}
    </main>
  );
}
