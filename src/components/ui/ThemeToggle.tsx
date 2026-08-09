"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/providers/ThemeProvider";
import { cn } from "@/lib/cn";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Hell", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dunkel", icon: Moon },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Farbschema"
      className={cn("bg-surface-2 border-border inline-flex gap-0.5 rounded-md border p-0.5", className)}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex size-7 items-center justify-center rounded-sm transition-colors",
            theme === value
              ? "bg-surface text-text shadow-sm"
              : "text-faint hover:text-text",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
