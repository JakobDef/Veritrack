import Link from "next/link";

// Placeholder root. M3 replaces this with the auth-aware redirect
// (signed out -> /login, no band -> /bands, otherwise -> /dashboard).
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold">Veritrack</h1>
      <p className="text-muted text-sm">Zeiterfassung für Bands. Aufbau läuft.</p>
      <Link href="/styleguide" className="text-accent text-sm underline underline-offset-4">
        Styleguide ansehen
      </Link>
    </main>
  );
}
