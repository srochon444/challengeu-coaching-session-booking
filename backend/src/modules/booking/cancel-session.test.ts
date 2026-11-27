import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { InMemoryEventBus } from "../../platform/event-bus.js";
import { users, availabilityBlocks } from "../../platform/schema.js";
import { drizzleBlockRepo, drizzleSessionRepo } from "./repo.js";
import { makeBookSession } from "./application/book-session.js";
import { makeCancelSession } from "./application/cancel-session.js";
import { makeListOpenBlocks } from "./application/list-open-blocks.js";
import { SESSION_CANCELLED } from "./events.js";

function setup(nowIso: string) {
  const { db } = createDb(":memory:");
  db.insert(users).values({ id: "c1", displayName: "C", role: "coach", timezone: "America/Toronto", createdAt: nowIso }).run();
  db.insert(users).values({ id: "s1", displayName: "s1", role: "student", timezone: "Europe/Paris", createdAt: nowIso }).run();
  db.insert(availabilityBlocks).values({ id: "b1", coachUserId: "c1", startsAtUtc: "2026-02-02T14:00:00.000Z", endsAtUtc: "2026-02-02T14:30:00.000Z", durationMin: 30, createdAt: nowIso }).run();
  const bus = new InMemoryEventBus();
  const blocks = drizzleBlockRepo(db), sessions = drizzleSessionRepo(db), clock = new FixedClock(nowIso);
  const book = makeBookSession({ blocks, sessions, enrollment: { canBook: async () => true }, bus, clock });
  const cancel = makeCancelSession({ sessions, bus, clock });
  const listOpen = makeListOpenBlocks({ blocks });
  const range = { coachUserId: "c1", fromUtc: "2026-02-01T00:00:00.000Z", toUtc: "2026-02-08T00:00:00.000Z" };
  return { book, cancel, listOpen: () => listOpen(range), bus };
}

test("cancel ≥24h before frees the slot (it becomes open again)", async () => {
  const { book, cancel, listOpen, bus } = setup("2026-01-20T00:00:00.000Z");
  const cancelled: unknown[] = [];
  bus.subscribe(SESSION_CANCELLED, (e) => cancelled.push(e));
  const s = await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  expect(listOpen()).toHaveLength(0);
  cancel({ sessionId: s.id, requesterUserId: "s1" });
  expect(cancelled).toHaveLength(1);
  expect(listOpen()).toHaveLength(1);
});

test("cancel <24h before is rejected", async () => {
  const { book, cancel } = setup("2026-02-02T06:00:00.000Z"); // 8h before start
  const s = await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  expect(() => cancel({ sessionId: s.id, requesterUserId: "s1" })).toThrow();
});

test("only the owning student may cancel", async () => {
  const { book, cancel } = setup("2026-01-20T00:00:00.000Z");
  const s = await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  expect(() => cancel({ sessionId: s.id, requesterUserId: "intruder" })).toThrow();
});
