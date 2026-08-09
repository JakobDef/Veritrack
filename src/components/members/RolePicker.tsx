"use client";

import { Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { ROLE_COLOR_KEYS, ROLE_COLOR_LABELS, roleColorVar } from "@/lib/roleColors";
import { FUNCTIONAL_ROLE_SUGGESTIONS } from "@/types/models";
import { cn } from "@/lib/cn";

/**
 * Picks the *functional* role (what you do in the band) and its color. This has
 * nothing to do with permissions; that is a separate control, deliberately, so
 * "Management" never implies admin rights.
 */
export function RolePicker({
  role,
  roleColor,
  onRoleChange,
  onColorChange,
  label = "Deine Rolle in der Band",
}: {
  role: string;
  roleColor: string;
  onRoleChange: (role: string) => void;
  onColorChange: (color: string) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Input
          label={label}
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
          placeholder="z. B. Gitarre"
          hint="Rein informativ. Sie steuert keine Berechtigungen."
        />
        <div className="flex flex-wrap gap-1.5">
          {FUNCTIONAL_ROLE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onRoleChange(suggestion)}
              className={cn(
                "border-border hover:border-border-strong hover:bg-surface-2 rounded-sm border px-2 py-1 text-xs transition-colors",
                role === suggestion && "border-accent bg-accent-soft text-accent",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-text mb-2 text-sm font-medium">Farbe</legend>
        <div className="flex flex-wrap gap-2">
          {ROLE_COLOR_KEYS.map((key) => {
            const selected = roleColor === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onColorChange(key)}
                aria-pressed={selected}
                aria-label={ROLE_COLOR_LABELS[key]}
                title={ROLE_COLOR_LABELS[key]}
                className="grid size-8 place-items-center rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: roleColorVar(key),
                  boxShadow: selected
                    ? `0 0 0 2px var(--vt-surface), 0 0 0 4px ${roleColorVar(key)}`
                    : undefined,
                }}
              >
                {selected ? <Check className="size-4 text-white drop-shadow" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
