import { describe, expect, it } from "vitest";
import { centsToEuroInput, eurosToCents, formatEur, payoutAmountCents } from "@/lib/money";

describe("payoutAmountCents", () => {
  it("pays 60 minutes at 10 EUR/h as 1000 cents", () => {
    expect(payoutAmountCents(60, 1000)).toBe(1000);
  });

  it("pays 90 minutes at 12,50 EUR/h as 1875 cents", () => {
    expect(payoutAmountCents(90, 1250)).toBe(1875);
  });

  it("rounds 1 minute at 30 c/h half-up to 1 cent", () => {
    expect(payoutAmountCents(1, 30)).toBe(1);
  });

  it("rounds 1 minute at 29 c/h down to 0 cents", () => {
    expect(payoutAmountCents(1, 29)).toBe(0);
  });

  it("returns 0 for non-positive inputs", () => {
    expect(payoutAmountCents(0, 1000)).toBe(0);
    expect(payoutAmountCents(60, 0)).toBe(0);
    expect(payoutAmountCents(-10, 1000)).toBe(0);
  });
});

describe("eurosToCents", () => {
  it("parses comma and dot decimals", () => {
    expect(eurosToCents("12,50")).toBe(1250);
    expect(eurosToCents("12.50")).toBe(1250);
  });

  it("treats empty as unset (0)", () => {
    expect(eurosToCents("")).toBe(0);
    expect(eurosToCents("  ")).toBe(0);
  });

  it("rejects negatives and junk", () => {
    expect(eurosToCents("-1")).toBeNull();
    expect(eurosToCents("abc")).toBeNull();
  });
});

describe("formatEur and centsToEuroInput", () => {
  it("formats 1250 cents with a German decimal comma", () => {
    expect(formatEur(1250)).toContain("12,50");
  });

  it("shows empty for an unset rate", () => {
    expect(centsToEuroInput(0)).toBe("");
    expect(centsToEuroInput(1250)).toBe("12,50");
  });
});
