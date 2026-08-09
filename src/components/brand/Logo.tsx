import { cn } from "@/lib/cn";

/**
 * Mark: a stopped clock hand over a waveform bar. Time plus sound, in one glyph.
 * Drawn inline so it inherits `currentColor` and needs no asset request.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-7", className)} aria-hidden>
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" stroke="currentColor" strokeWidth="2.5" />
      <path
        d="M16 8.5V16l4.5 3"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 23.5h16" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className="text-accent size-7" />
      <span className="font-display text-[17px] font-semibold tracking-tight">Veritrack</span>
    </span>
  );
}
