import { expect, test } from "vitest";
import { blocksOverlap, canCancel, isInFuture, MAX_UPCOMING } from "./rules.js";

const blk = (s: string, e: string) => ({ startsAtUtc: s, endsAtUtc: e });

test("overlap: identical and containing ranges overlap", () => {
  expect(blocksOverlap(blk("2026-02-01T14:00:00Z", "2026-02-01T14:30:00Z"), blk("2026-02-01T14:00:00Z", "2026-02-01T14:30:00Z"))).toBe(true);
  expect(blocksOverlap(blk("2026-02-01T14:00:00Z", "2026-02-01T15:00:00Z"), blk("2026-02-01T14:15:00Z", "2026-02-01T14:45:00Z"))).toBe(true);
});
test("overlap: adjacent (touching) ranges do NOT overlap", () => {
  expect(blocksOverlap(blk("2026-02-01T14:00:00Z", "2026-02-01T14:30:00Z"), blk("2026-02-01T14:30:00Z", "2026-02-01T15:00:00Z"))).toBe(false);
});
test("canCancel: boundary at 24h", () => {
  const start = "2026-02-02T14:00:00.000Z";
  expect(canCancel(start, new Date("2026-02-01T13:59:00.000Z"))).toBe(true);   // >24h before
  expect(canCancel(start, new Date("2026-02-01T14:00:00.000Z"))).toBe(true);   // exactly 24h
  expect(canCancel(start, new Date("2026-02-01T14:01:00.000Z"))).toBe(false);  // <24h
});
test("isInFuture: strictly after now", () => {
  const now = new Date("2026-02-01T12:00:00.000Z");
  expect(isInFuture("2026-02-01T12:00:01.000Z", now)).toBe(true);
  expect(isInFuture("2026-02-01T12:00:00.000Z", now)).toBe(false); // exactly now is not upcoming
  expect(isInFuture("2026-02-01T11:59:59.000Z", now)).toBe(false);
});
test("MAX_UPCOMING is 3", () => { expect(MAX_UPCOMING).toBe(3); });
