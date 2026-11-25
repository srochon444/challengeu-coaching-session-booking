import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { InMemoryEventBus } from "../../platform/event-bus.js";
import { users, availabilityBlocks } from "../../platform/schema.js";
import { drizzleBlockRepo, drizzleSessionRepo } from "./repo.js";
import { makeBookSession } from "./application/book-session.js";
import { SESSION_BOOKED } from "./events.js";

function setup(opts?: { canBook?: boolean }) {
  const { db } = createDb(":memory:");
  const now = "2026-01-10T00:00:00.000Z";
  db.insert(users).values({ id: "c1", displayName: "C", role: "coach", timezone: "America/Toronto", createdAt: now }).run();
  for (const s of ["s1", "s2"]) db.insert(users).values({ id: s, displayName: s, role: "student", timezone: "Europe/Paris", createdAt: now }).run();
  const mkBlock = (id: string, start: string) =>
    db.insert(availabilityBlocks).values({ id, coachUserId: "c1", startsAtUtc: start, endsAtUtc: start.replace(":00:00.000Z", ":30:00.000Z"), durationMin: 30, createdAt: now }).run();
  mkBlock("b1", "2026-02-01T14:00:00.000Z");
  const bus = new InMemoryEventBus();
  const book = makeBookSession({
    blocks: drizzleBlockRepo(db), sessions: drizzleSessionRepo(db),
    enrollment: { canBook: async () => opts?.canBook ?? true },
    bus, clock: new FixedClock(now),
  });
  return { db, bus, book, mkBlock };
}

test("books an open slot and emits SessionBooked", async () => {
  const { bus, book } = setup();
  const events: unknown[] = [];
  bus.subscribe(SESSION_BOOKED, (e) => events.push(e));
  const s = await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  expect(s.status).toBe("confirmed");
  expect(events).toHaveLength(1);
});

test("suspended student cannot book", async () => {
  const { book } = setup({ canBook: false });
  await expect(book({ studentUserId: "s1", availabilityBlockId: "b1" })).rejects.toThrow();
});

test("two bookings on the same block → exactly one confirmed (double-booking impossible)", async () => {
  const { book } = setup();
  const results = await Promise.allSettled([
    book({ studentUserId: "s1", availabilityBlockId: "b1" }),
    book({ studentUserId: "s2", availabilityBlockId: "b1" }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
});

test("4th upcoming booking is rejected (max 3)", async () => {
  const { book, mkBlock } = setup();
  mkBlock("b2", "2026-02-02T14:00:00.000Z");
  mkBlock("b3", "2026-02-03T14:00:00.000Z");
  mkBlock("b4", "2026-02-04T14:00:00.000Z");
  await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  await book({ studentUserId: "s1", availabilityBlockId: "b2" });
  await book({ studentUserId: "s1", availabilityBlockId: "b3" });
  await expect(book({ studentUserId: "s1", availabilityBlockId: "b4" })).rejects.toThrow();
});
