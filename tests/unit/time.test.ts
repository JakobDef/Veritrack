import { describe, expect, it } from "vitest";
import {
  elapsedMs,
  formatClock,
  formatDuration,
  formatHours,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
  combineLocalDateTime,
  entryRangeError,
  entryDescriptionError,
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

  it("reads clock fields as local wall time, not UTC", () => {
    const morning = fromDateTimeLocalValue("2026-08-14T07:00");
    expect(morning?.getFullYear()).toBe(2026);
    expect(morning?.getMonth()).toBe(7);
    expect(morning?.getDate()).toBe(14);
    expect(morning?.getHours()).toBe(7);
    expect(morning?.getMinutes()).toBe(0);
  });

  it("accepts seconds from <input type=time>", () => {
    const withSeconds = fromDateTimeLocalValue("2026-08-14T07:00:00");
    expect(withSeconds?.getHours()).toBe(7);
    expect(withSeconds?.getSeconds()).toBe(0);
  });

  it("rejects unparseable input", () => {
    expect(fromDateTimeLocalValue("")).toBeNull();
    expect(fromDateTimeLocalValue("nonsense")).toBeNull();
    expect(fromDateTimeLocalValue("2026-02-31T10:00")).toBeNull();
  });

  it("combines a date input and a time input as local", () => {
    const combined = combineLocalDateTime("2026-08-14", "09:00");
    expect(combined?.getHours()).toBe(9);
    expect(combined?.getDate()).toBe(14);
    expect(combineLocalDateTime("", "09:00")).toBeNull();
    expect(combineLocalDateTime("2026-08-14", "")).toBeNull();
  });
});

describe("entryRangeError", () => {
  const now = new Date(2026, 7, 14, 11, 45);

  it("allows a range earlier the same morning", () => {
    const start = new Date(2026, 7, 14, 7, 0);
    const end = new Date(2026, 7, 14, 9, 0);
    expect(entryRangeError(start, end, now)).toBeNull();
  });

  it("rejects a start later today", () => {
    const start = new Date(2026, 7, 14, 19, 0);
    const end = new Date(2026, 7, 14, 21, 0);
    expect(entryRangeError(start, end, now)).toBe("Ein Eintrag kann nicht in der Zukunft beginnen.");
  });

  it("allows a start up to one minute ahead of now", () => {
    const start = new Date(now.getTime() + 30_000);
    const end = new Date(now.getTime() + 30 * 60_000);
    expect(entryRangeError(start, end, now)).toBeNull();
  });

  it("rejects a zero-length range", () => {
    const t = new Date(2026, 7, 14, 7, 0);
    expect(entryRangeError(t, t, now)).toBe("Das Ende muss nach dem Start liegen.");
  });

  it("rejects a range longer than 24 hours", () => {
    const start = new Date(2026, 7, 13, 8, 0);
    const end = new Date(2026, 7, 14, 8, 1);
    expect(entryRangeError(start, end, now)).toBe(
      "Ein einzelner Eintrag kann höchstens 24 Stunden lang sein.",
    );
  });
});

describe("entryDescriptionError", () => {
  it("rejects empty and whitespace-only text", () => {
    expect(entryDescriptionError("")).toBe("Bitte beschreibe, woran du arbeitest.");
    expect(entryDescriptionError("   ")).toBe("Bitte beschreibe, woran du arbeitest.");
    expect(entryDescriptionError("\n\t")).toBe("Bitte beschreibe, woran du arbeitest.");
  });

  it("accepts real text", () => {
    expect(entryDescriptionError("Soundcheck")).toBeNull();
    expect(entryDescriptionError("  Soundcheck  ")).toBeNull();
  });
});
