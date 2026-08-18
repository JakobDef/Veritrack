import { payoutAmountCents } from "./money";
import type { BandMember, TimeEntry } from "@/types/models";

const REMOVED_MEMBER_LABEL = "Entferntes Mitglied";

export function isPayoutOpenEntry(
  entry: Pick<TimeEntry, "payoutId" | "endTime" | "duration">,
): boolean {
  return entry.payoutId == null && entry.endTime != null && typeof entry.duration === "number";
}

export function memberDisplayName(
  userId: string,
  members: Pick<BandMember, "id" | "displayName">[],
): string {
  return members.find((member) => member.id === userId)?.displayName || REMOVED_MEMBER_LABEL;
}

export type OpenMemberGroup = {
  userId: string;
  displayName: string;
  minutes: number;
  amountCents: number;
  entries: TimeEntry[];
};

export function openByMember(
  entries: TimeEntry[],
  members: Pick<BandMember, "id" | "displayName">[],
  hourlyRateCents: number,
): OpenMemberGroup[] {
  const grouped = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    if (!isPayoutOpenEntry(entry)) continue;
    const list = grouped.get(entry.userId);
    if (list) list.push(entry);
    else grouped.set(entry.userId, [entry]);
  }

  const result: OpenMemberGroup[] = [];
  for (const [userId, openEntries] of grouped) {
    const minutes = openEntries.reduce((sum, entry) => sum + (entry.duration ?? 0), 0);
    if (minutes <= 0) continue;
    result.push({
      userId,
      displayName: memberDisplayName(userId, members),
      minutes,
      amountCents: payoutAmountCents(minutes, hourlyRateCents),
      entries: [...openEntries].sort((a, b) => b.startTime.getTime() - a.startTime.getTime()),
    });
  }

  result.sort((a, b) => a.displayName.localeCompare(b.displayName, "de"));
  return result;
}
