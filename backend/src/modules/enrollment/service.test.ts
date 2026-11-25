import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { createIdentityModule } from "../identity/index.js";
import { createEnrollmentModule } from "./index.js";

function setup() {
  const { db } = createDb(":memory:");
  const clock = new FixedClock("2026-01-01T00:00:00.000Z");
  const identity = createIdentityModule(db, clock).api;
  return createEnrollmentModule(db, identity, clock);
}

test("register creates an active student; canBook is true", async () => {
  const m = setup();
  const s = m.service.register("Zoe", "America/Vancouver");
  expect(await m.port.canBook(s.studentUserId)).toBe(true);
});

test("suspend flips canBook to false; reactivate restores it (EnrollmentPort contract)", async () => {
  const m = setup();
  const s = m.service.register("Zoe", "America/Vancouver");
  m.service.setStatus(s.studentUserId, "suspended");
  expect(await m.port.canBook(s.studentUserId)).toBe(false);
  m.service.setStatus(s.studentUserId, "active");
  expect(await m.port.canBook(s.studentUserId)).toBe(true);
});

test("canBook is false for an unknown student", async () => {
  const m = setup();
  expect(await m.port.canBook("nobody")).toBe(false);
});
