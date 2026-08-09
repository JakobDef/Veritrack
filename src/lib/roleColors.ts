/**
 * The fixed 8-color palette used for functional roles (members) and projects.
 *
 * Firestore stores the *key* ("role-3"), not a hex value. Resolving to a CSS
 * variable at render time means every stored color automatically picks the
 * light or dark variant defined in globals.css, so a color chosen in light mode
 * stays legible in dark mode. Raw hex values are still tolerated on read so
 * hand-edited or imported data does not break the UI.
 */

export const ROLE_COLOR_KEYS = [
  "role-1",
  "role-2",
  "role-3",
  "role-4",
  "role-5",
  "role-6",
  "role-7",
  "role-8",
] as const;

export type RoleColorKey = (typeof ROLE_COLOR_KEYS)[number];

/**
 * Labels match the slot order defined in globals.css. That order is validated
 * for colour-vision separation between neighbouring slots, so do not resequence
 * these without re-running the palette validator.
 */
export const ROLE_COLOR_LABELS: Record<RoleColorKey, string> = {
  "role-1": "Ember",
  "role-2": "Türkis",
  "role-3": "Gold",
  "role-4": "Pflaume",
  "role-5": "Moos",
  "role-6": "Indigo",
  "role-7": "Rose",
  "role-8": "Himmel",
};

export function isRoleColorKey(value: string): value is RoleColorKey {
  return (ROLE_COLOR_KEYS as readonly string[]).includes(value);
}

/**
 * Resolve a stored color to something usable in a `style` prop or an SVG fill.
 * Accepts a palette key, a raw hex/color string, or nothing.
 */
export function roleColorVar(value: string | null | undefined): string {
  if (!value) return "var(--vt-faint)";
  if (isRoleColorKey(value)) return `var(--vt-${value})`;
  return value;
}

/** Deterministic palette pick, so a member without an explicit color still reads distinctly. */
export function fallbackRoleColor(seed: string): RoleColorKey {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return ROLE_COLOR_KEYS[hash % ROLE_COLOR_KEYS.length] as RoleColorKey;
}
