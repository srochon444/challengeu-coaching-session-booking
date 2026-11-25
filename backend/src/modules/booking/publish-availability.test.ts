import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { drizzleBlockRepo } from "./repo.js";
import { makePublishAvailability } from "./application/publish-availability.js";
import { users } from "../../platform/schema.js";

function setup() {
  const { db } = createDb(":memory:");
  db.insert(users).values({ id: "c1", displayName: "C", role: "coach", timezone: "America/Toronto", createdAt: "2026-01-01T00:00:00.000Z" }).run();
  const publish = makePublishAvailability({ blocks: drizzleBlockRepo(db), clock: new FixedClock("2026-01-01T00:00:00.000Z") });
  return { publish };
}

test("publishes a 30-min block", () => {
  const { publish } = setup();
  const b = publish({ coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", durationMin: 30 });
  expect(b.endsAtUtc).toBe("2026-02-01T14:30:00.000Z");
});
test("rejects an overlapping block", () => {
  const { publish } = setup();
  publish({ coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", durationMin: 60 });
  expect(() => publish({ coachUserId: "c1", startsAtUtc: "2026-02-01T14:30:00.000Z", durationMin: 30 })).toThrow();
});
test("rejects an invalid duration", () => {
  const { publish } = setup();
  expect(() => publish({ coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", durationMin: 45 as 30 })).toThrow();
});
