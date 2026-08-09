import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_460px]">
      {/* Brand panel. Hidden on small screens where it would just push the form
          below the fold. */}
      <aside className="bg-surface-2 border-border relative hidden flex-col justify-between overflow-hidden border-r p-10 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 22%, color-mix(in oklab, var(--vt-accent) 26%, transparent), transparent 46%), radial-gradient(circle at 78% 72%, color-mix(in oklab, var(--vt-role-6) 22%, transparent), transparent 50%)",
          }}
        />
        <Link href="/" className="relative">
          <Wordmark />
        </Link>
        <div className="relative flex max-w-md flex-col gap-4">
          <h1 className="font-display text-4xl leading-[1.1] font-semibold text-balance">
            Ein Klick, und die Zeit läuft.
          </h1>
          <p className="text-muted text-[15px] leading-relaxed">
            Veritrack hält fest, wer wie lange woran gearbeitet hat, ohne dass jemand daran denken
            muss. Proben, Studio, Booking, alles an einem Ort.
          </p>
        </div>
        <p className="text-faint relative text-xs">
          Zeiterfassung, Projekte und Aufgaben für Bands.
        </p>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
