import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="text-faint size-10" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Diese Seite gibt es nicht</h1>
        <p className="text-muted text-sm">Vielleicht wurde sie verschoben oder gelöscht.</p>
      </div>
      <Link
        href="/dashboard"
        className="bg-accent text-accent-fg hover:bg-accent-hover flex h-10 items-center rounded-md px-4 text-sm font-medium transition-colors"
      >
        Zum Dashboard
      </Link>
    </main>
  );
}
