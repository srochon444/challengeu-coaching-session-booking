import { describe, expect, test } from "vitest";
import { wallTimeToUtcIso, addMinutesIso, formatInZone, weekBoundsUtc } from "./tz.js";

describe("wallTimeToUtcIso", () => {
  test("Toronto 9:00 in winter (EST, -05:00) → 14:00Z", () => {
    expect(wallTimeToUtcIso("2026-01-12T09:00", "America/Toronto")).toBe("2026-01-12T14:00:00.000Z");
  });
  test("Paris 9:00 in winter (CET, +01:00) → 08:00Z", () => {
    expect(wallTimeToUtcIso("2026-01-12T09:00", "Europe/Paris")).toBe("2026-01-12T08:00:00.000Z");
  });
  // DST: Toronto springs forward 2026-03-08; Paris not until 2026-03-29.
  test("DST: same wall time, different offsets across zones on 2026-03-15", () => {
    expect(wallTimeToUtcIso("2026-03-15T09:00", "America/Toronto")).toBe("2026-03-15T13:00:00.000Z"); // EDT -04
    expect(wallTimeToUtcIso("2026-03-15T09:00", "Europe/Paris")).toBe("2026-03-15T08:00:00.000Z");   // CET +01
  });
});

describe("addMinutesIso", () => {
  test("adds 30 minutes", () => {
    expect(addMinutesIso("2026-01-12T14:00:00.000Z", 30)).toBe("2026-01-12T14:30:00.000Z");
  });
});

describe("weekBoundsUtc", () => {
  test("Vancouver week around a Wednesday starts Monday 00:00 local", () => {
    const { fromUtc, toUtc } = weekBoundsUtc("2026-01-14T20:00:00.000Z", "America/Vancouver");
    // Monday 2026-01-12 00:00 PST (-08) = 08:00Z; end is start of next Monday.
    expect(fromUtc).toBe("2026-01-12T08:00:00.000Z");
    expect(toUtc).toBe("2026-01-19T08:00:00.000Z");
  });
});

describe("formatInZone", () => {
  test("renders a UTC instant in the viewer zone", () => {
    expect(formatInZone("2026-01-12T14:00:00.000Z", "America/Toronto")).toContain("9:00");
    expect(formatInZone("2026-01-12T14:00:00.000Z", "Europe/Paris")).toContain("3:00");
  });
});
