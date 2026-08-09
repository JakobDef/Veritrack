/**
 * Invite codes are read aloud, typed by hand and pasted from chat, so the
 * alphabet drops every character pair people confuse: I/1, O/0, S/5, B/8, Z/2.
 * 8 characters from a 26-symbol alphabet is ~37 bits, plenty given that a code
 * only ever grants "become a plain member of one specific band".
 */
const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679";
const LENGTH = 8;

export function generateInviteCode(): string {
  const bytes = new Uint8Array(LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

/**
 * Accepts what a human actually pastes: lower case, stray spaces or dashes, a
 * full invite URL. Returns "" when nothing usable is left, so callers can treat
 * empty as invalid without a second check.
 */
export function normalizeInviteCode(input: string): string {
  const tail = input.trim().split(/[/?#]/).filter(Boolean).pop() ?? "";
  const cleaned = tail.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length === LENGTH ? cleaned : "";
}

export function inviteLink(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/bands/join/${code}`;
}
