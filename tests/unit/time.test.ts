import { describe, expect, it } from "vitest";
import {
  elapsedMs,
  formatClock,
  formatDuration,
  formatHours,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  toMinutes,
} from "@/lib/time";

describe("elapsedMs", () => {
  it("measures forward time", () => {
    expect(elapsedMs(new Date("2026-08-09T10:00:00Z"), new Date("2026-08-09T10:00:30Z"))).toBe(30_000);
  });

  it("clamps to zero when the clocks disagree", () => {
    // serverTimestamp() can land slightly ahead of the local clock; a negative
    // elapsed time would render as a nonsense countdown.
    expect(elapsedMs(new Date("2026-08-09T10:00:05Z"), new Date("2026-08-09T10:00:00Z"))).toBe(0);
  });
});

describe("formatClock", () => {
  it("renders zero", () => {
    expect(formatClock(0)).toBe("0:00:00");
  });

  it("pads seconds and minutes", () => {
    expect(formatClock(7_000)).toBe("0:00:07");
    expect(formatClock(65_000)).toBe("0:01:05");
  });

  it("rolls over into hours", () => {
    expect(formatClock(3_600_000)).toBe("1:00:00");
    expect(formatClock(5_025_000)).toBe("1:23:45");
  });

  it("does not cap at 24 hours", () => {
    expect(formatClock(26 * 3_600_000)).toBe("26:00:00");
  });

  it("truncates rather than rounds, so the clock never shows a second early", () => {
    expect(formatClock(1_999)).toBe("0:00:01");
  });

  it("treats negative input as zero", () => {
    expect(formatClock(-5_000)).toBe("0:00:00");
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0m"],
    [1, "1m"],
    [45, "45m"],
    [60, "1h"],
    [135, "2h 15m"],
    [1_440, "24h"],
  ])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });

  it("treats null, undefined and negatives as zero", () => {
    expect(formatDuration(null)).toBe("0m");
    expect(formatDuration(undefined)).toBe("0m");
    expect(formatDuration(-30)).toBe("0m");
  });
});

describe("formatHours", () => {
  it("uses a German decimal comma", () => {
    expect(formatHours(138)).toBe("2,3 h");
    expect(formatHours(0)).toBe("0 h");
  });
});

describe("toMinutes", () => {
  it("rounds to the nearest minute", () => {
    const start = new Date("2026-08-09T10:00:00Z");
    expect(toMinutes(start, new Date("2026-08-09T10:02:00Z"))).toBe(2);
    // 90 seconds is real work; rounding down to 1 would quietly lose it.
    expect(toMinutes(start, new Date("2026-08-09T10:01:30Z"))).toBe(2);
    expect(toMinutes(start, new Date("2026-08-09T10:00:29Z"))).toBe(0);
  });

  it("never returns a negative duration", () => {
    expect(toMinutes(new Date("2026-08-09T10:05:00Z"), new Date("2026-08-09T10:00:00Z"))).toBe(0);
  });

  it("handles a gig that runs past midnight", () => {
    expect(toMinutes(new Date("2026-08-09T22:00:00Z"), new Date("2026-08-10T01:00:00Z"))).toBe(180);
  });
});

describe("datetime-local round trip", () => {
  it("survives a round trip in local time", () => {
    const original = new Date(2026, 7, 9, 14, 5, 0, 0);
    const restored = fromDateTimeLocalValue(toDateTimeLocalValue(original));
    expect(restored?.getFullYear()).toBe(2026);
    expect(restored?.getMonth()).toBe(7);
    expect(restored?.getDate()).toBe(9);
    expect(restored?.getHours()).toBe(14);
    expect(restored?.getMinutes()).toBe(5);
  });

  it("zero-pads single-digit months, days, hours and minutes", () => {
    expect(toDateTimeLocalValue(new Date(2026, 0, 3, 4, 7))).toBe("2026-01-03T04:07");
  });

  it("rejects unparseable input", () => {
    expect(fromDateTimeLocalValue("")).toBeNull();
    expect(fromDateTimeLocalValue("nonsense")).toBeNull();
  });
});
