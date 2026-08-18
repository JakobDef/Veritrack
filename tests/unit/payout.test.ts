import { describe, expect, it } from "vitest";
import { isPayoutOpenEntry, openByMember } from "@/lib/payout";
import type { TimeEntry } from "@/types/models";

function entry(partial: Partial<TimeEntry> & { userId: string }): TimeEntry {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    projectId: partial.projectId === undefined ? "p1" : partial.projectId,
    taskId: null,
    description: "Probe",
    startTime: new Date(2026, 7, 9, 18, 0),
    endTime: new Date(2026, 7, 9, 20, 0),
    duration: 120,
    createdAt: new Date(),
    payoutId: null,
    ...partial,
  };
}

const members = [
  { id: "jakob", displayName: "Jakob" },
  { id: "lisa", displayName: "Lisa" },
];

describe("isPayoutOpenEntry", () => {
  it("excludes a running timer", () => {
    expect(
      isPayoutOpenEntry(entry({ userId: "jakob", endTime: null, duration: null })),
    ).toBe(false);
  });

  it("excludes a paid entry", () => {
    expect(isPayoutOpenEntry(entry({ userId: "jakob", payoutId: "p-1" }))).toBe(false);
  });

  it("treats missing payoutId as unpaid", () => {
    const unpaid = entry({ userId: "jakob" });
    expect(unpaid.payoutId).toBeNull();
    expect(isPayoutOpenEntry(unpaid)).toBe(true);
  });
});

describe("openByMember", () => {
  it("groups by user and ignores project assignment", () => {
    const groups = openByMember(
      [
        entry({ userId: "jakob", projectId: null, duration: 60 }),
        entry({ userId: "jakob", projectId: "p1", duration: 30 }),
        entry({ userId: "lisa", duration: 120 }),
      ],
      members,
      1000,
    );
    expect(groups.map((g) => [g.displayName, g.minutes, g.amountCents])).toEqual([
      ["Jakob", 90, 1500],
      ["Lisa", 120, 2000],
    ]);
  });

  it("omits running, paid, and zero-minute users", () => {
    const groups = openByMember(
      [
        entry({ userId: "jakob", endTime: null, duration: null }),
        entry({ userId: "lisa", payoutId: "p-1" }),
        entry({ userId: "jakob", duration: 0 }),
      ],
      members,
      1000,
    );
    expect(groups).toEqual([]);
  });

  it("emits a leftover group when the member document is gone", () => {
    const groups = openByMember(
      [entry({ userId: "gone", duration: 45 })],
      [],
      1250,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.displayName).toBe("Entferntes Mitglied");
    expect(groups[0]?.userId).toBe("gone");
    expect(groups[0]?.minutes).toBe(45);
  });
});
