/**
 * Integer euro-cents helpers. Money is never stored as a float.
 *
 * `payoutAmountCents` multiplies minutes by the hourly rate in cents, then
 * divides by 60. JS `Math.round` on positives is half-up (0.5 -> 1), not
 * banker's rounding. Multiply before divide so the only rounding is that last
 * `Math.round`.
 */

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function payoutAmountCents(minutes: number, hourlyRateCents: number): number {
  if (!(minutes > 0) || !(hourlyRateCents > 0)) return 0;
  return Math.round((minutes * hourlyRateCents) / 60);
}

export function formatEur(cents: number): string {
  return eurFormatter.format(cents / 100);
}

/** Display value for the Settings rate field: empty when unset. */
export function centsToEuroInput(cents: number): string {
  if (!(cents > 0)) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Parse a German or dotted euro string into integer cents.
 * Empty / whitespace is 0 (unset). Rejects negatives, NaN, and junk.
 */
export function eurosToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return 0;
  const normalized = trimmed.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const euros = Number(normalized);
  if (!Number.isFinite(euros) || euros < 0) return null;
  return Math.round(euros * 100);
}
