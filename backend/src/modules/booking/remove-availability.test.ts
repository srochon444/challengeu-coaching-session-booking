import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { drizzleBlockRepo } from "./repo.js";
import { makeRemoveAvailability } from "./application/remove-availability.js";
import { users, availabilityBlocks, sessions } from "../../platform/schema.js";

function setup() {
  const { db } = createDb(":memory:");
  const at = "2026-01-01T00:00:00.000Z";
  db.insert(users).values({ id: "c1", displayName: "C1", role: "coach", timezone: "America/Toronto", createdAt: at }).run();
  db.insert(users).values({ id: "c2", displayName: "C2", role: "coach", timezone: "America/Toronto", createdAt: at }).run();
  db.insert(users).values({ id: "s1", displayName: "S1", role: "student", timezone: "Europe/Paris", createdAt: at }).run();
  const addBlock = (id: string) =>
    db.insert(availabilityBlocks).values({ id, coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", endsAtUtc: "2026-02-01T14:30:00.000Z", durationMin: 30, createdAt: at }).run();
  const blocks = drizzleBlockRepo(db);
  return { db, blocks, addBlock, remove: makeRemoveAvailability({ blocks }) };
}

test("coach removes their own unbooked block", () => {
  const { blocks, addBlock, remove } = setup();
  addBlock("b1");
  remove({ blockId: "b1", coachUserId: "c1" });
  expect(blocks.byId("b1")).toBeUndefined();
});

test("a different coach cannot remove the block", () => {
  const { addBlock, remove, blocks } = setup();
  addBlock("b1");
  expect(() => remove({ blockId: "b1", coachUserId: "c2" })).toThrow();
  expect(blocks.byId("b1")).toBeDefined();
});

test("a booked (confirmed) block cannot be removed", () => {
  const { db, addBlock, remove, blocks } = setup();
  addBlock("b1");
  db.insert(sessions).values({
    id: "x1", availabilityBlockId: "b1", studentUserId: "s1", coachUserId: "c1",
    startsAtUtc: "2026-02-01T14:00:00.000Z", endsAtUtc: "2026-02-01T14:30:00.000Z",
    status: "confirmed", createdAt: "2026-01-01T00:00:00.000Z", cancelledAt: null,
  }).run();
  expect(() => remove({ blockId: "b1", coachUserId: "c1" })).toThrow();
  expect(blocks.byId("b1")).toBeDefined();
});

test("removing a missing block throws", () => {
  const { remove } = setup();
  expect(() => remove({ blockId: "nope", coachUserId: "c1" })).toThrow();
});
