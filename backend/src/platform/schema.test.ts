import { expect, test } from "vitest";
import { createDb } from "./db.js";
import { sessions, availabilityBlocks, users } from "./schema.js";

test("partial unique index rejects a second confirmed session on the same block", () => {
  const { db } = createDb(":memory:");
  db.insert(users).values({ id: "c1", displayName: "Coach", role: "coach", timezone: "America/Toronto", createdAt: "2026-01-01T00:00:00.000Z" }).run();
  db.insert(users).values({ id: "s1", displayName: "S1", role: "student", timezone: "Europe/Paris", createdAt: "2026-01-01T00:00:00.000Z" }).run();
  db.insert(users).values({ id: "s2", displayName: "S2", role: "student", timezone: "Europe/Paris", createdAt: "2026-01-01T00:00:00.000Z" }).run();
  db.insert(availabilityBlocks).values({ id: "b1", coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", endsAtUtc: "2026-02-01T14:30:00.000Z", durationMin: 30, createdAt: "2026-01-01T00:00:00.000Z" }).run();

  const base = { availabilityBlockId: "b1", coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", endsAtUtc: "2026-02-01T14:30:00.000Z", status: "confirmed" as const, createdAt: "2026-01-01T00:00:00.000Z", cancelledAt: null };
  db.insert(sessions).values({ id: "x1", studentUserId: "s1", ...base }).run();
  expect(() => db.insert(sessions).values({ id: "x2", studentUserId: "s2", ...base }).run()).toThrow();
});
