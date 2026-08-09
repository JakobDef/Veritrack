import { describe, expect, it } from "vitest";
import {
  bucketByLocalDay,
  dayKey,
  dayRange,
  monthGrid,
  monthRange,
  weekDays,
  weekRange,
} from "@/lib/dates";

/**
 * These tests run in the machine's local timezone on purpose: every helper is
 * specified as local-time, and pinning a timezone here would test something the
 * app never does.
 */

describe("weekRange", () => {
  it("starts on Monday and ends on Sunday", () => {
    // 2026-08-09 is a Sunday.
    const { from, to } = weekRange(new Date(2026, 7, 9, 15, 0));
    expect(from.getDay()).toBe(1);
    expect(to.getDay()).toBe(0);
    expect(dayKey(from)).toBe("2026-08-03");
    expect(dayKey(to)).toBe("2026-08-09");
  });

  it("keeps a Monday in its own week rather than the previous one", () => {
    const { from } = weekRange(new Date(2026, 7, 10, 0, 30));
    expect(dayKey(from)).toBe("2026-08-10");
  });

  it("spans the full day at both ends", () => {
    const { from, to } = weekRange(new Date(2026, 7, 9));
    expect(from.getHours()).toBe(0);
    expect(to.getHours()).toBe(23);
    expect(to.getMinutes()).toBe(59);
  });

  it("returns seven consecutive days", () => {
    const days = weekDays(new Date(2026, 7, 9));
    expect(days).toHaveLength(7);
    expect(days.map((d) => dayKey(d))).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });
});

describe("monthGrid", () => {
  it("returns whole weeks of seven days", () => {
    const grid = monthGrid(new Date(2026, 7, 15));
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it("pads with adjacent months so the rectangle is complete", () => {
    // August 2026 starts on a Saturday, so the first row reaches back into July.
    const grid = monthGrid(new Date(2026, 7, 15));
    const first = grid[0]![0]!;
    expect(first.getMonth()).toBe(6);
    expect(first.getDay()).toBe(1);

    const lastWeek = grid[grid.length - 1]!;
    expect(lastWeek[6]!.getDay()).toBe(0);
  });

  it("covers every day of the target month", () => {
    const grid = monthGrid(new Date(2026, 1, 10));
    const keys = new Set(grid.flat().map((d) => dayKey(d)));
    // 2026 is not a leap year, so February has 28 days.
    for (let day = 1; day <= 28; day++) {
      expect(keys.has(`2026-02-${String(day).padStart(2, "0")}`)).toBe(true);
    }
  });
});

describe("monthRange", () => {
  it("covers the first to the last day of the month", () => {
    const { from, to } = monthRange(new Date(2026, 7, 15));
    expect(dayKey(from)).toBe("2026-08-01");
    expect(dayKey(to)).toBe("2026-08-31");
  });
});

describe("dayRange across a DST change", () => {
  it("still spans one calendar day when the clocks go forward", () => {
    // Last Sunday in March 2026: European DST starts, so this day is 23h long.
    const { from, to } = dayRange(new Date(2026, 2, 29, 12, 0));
    expect(dayKey(from)).toBe("2026-03-29");
    expect(dayKey(to)).toBe("2026-03-29");
    expect(from.getHours()).toBe(0);
  });

  it("still spans one calendar day when the clocks go back", () => {
    const { from, to } = dayRange(new Date(2026, 9, 25, 12, 0));
    expect(dayKey(from)).toBe("2026-10-25");
    expect(dayKey(to)).toBe("2026-10-25");
  });
});

describe("bucketByLocalDay", () => {
  it("groups by the local start day", () => {
    const items = [
      { id: "a", startTime: new Date(2026, 7, 9, 10, 0) },
      { id: "b", startTime: new Date(2026, 7, 9, 20, 0) },
      { id: "c", startTime: new Date(2026, 7, 10, 9, 0) },
    ];
    const buckets = bucketByLocalDay(items);
    expect(buckets.get("2026-08-09")?.map((i) => i.id)).toEqual(["a", "b"]);
    expect(buckets.get("2026-08-10")?.map((i) => i.id)).toEqual(["c"]);
  });

  it("files a gig that crosses midnight under the day it started", () => {
    // Documented decision: an entry belongs entirely to its start day, so the
    // entry list and the per-day totals cannot disagree.
    const gig = { id: "gig", startTime: new Date(2026, 7, 9, 22, 0) };
    const buckets = bucketByLocalDay([gig]);
    expect(buckets.get("2026-08-09")?.map((i) => i.id)).toEqual(["gig"]);
    expect(buckets.has("2026-08-10")).toBe(false);
  });

  it("returns an empty map for no input", () => {
    expect(bucketByLocalDay([]).size).toBe(0);
  });
});
