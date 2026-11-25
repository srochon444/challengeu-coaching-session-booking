import { expect, test } from "vitest";
import request from "supertest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { availabilityBlocks } from "../../platform/schema.js";
import { buildApp } from "../../test-support/app.js";

function setup() {
  const { db } = createDb(":memory:");
  const built = buildApp(db, new FixedClock("2026-01-10T00:00:00.000Z"));
  const coach = built.identity.api.createAccount({ displayName: "Coach", role: "coach", timezone: "America/Toronto" });
  db.insert(availabilityBlocks).values({ id: "b1", coachUserId: coach.id, startsAtUtc: "2026-02-01T14:00:00.000Z", endsAtUtc: "2026-02-01T14:30:00.000Z", durationMin: 30, createdAt: "2026-01-10T00:00:00.000Z" }).run();
  return { db, ...built, coach };
}
const login = (app: import("express").Express, userId: string) =>
  request(app).post("/auth/login").send({ userId }).then((r) => r.body.token as string);

test("double-booking over HTTP returns 409 (no crash from async rejection)", async () => {
  const { app, enrollment } = setup();
  const a = enrollment.service.register("A", "Europe/Paris");
  const b = enrollment.service.register("B", "Europe/Paris");
  const [ta, tb] = [await login(app, a.studentUserId), await login(app, b.studentUserId)];

  const first = await request(app).post("/sessions").set("authorization", `Bearer ${ta}`).send({ availabilityBlockId: "b1" });
  expect(first.status).toBe(201);
  const second = await request(app).post("/sessions").set("authorization", `Bearer ${tb}`).send({ availabilityBlockId: "b1" });
  expect(second.status).toBe(409);
  expect(second.body.code).toBe("SLOT_TAKEN");
});

test("suspended student booking over HTTP returns 403", async () => {
  const { app, enrollment } = setup();
  const s = enrollment.service.register("S", "Europe/Paris");
  enrollment.service.setStatus(s.studentUserId, "suspended");
  const token = await login(app, s.studentUserId);
  const res = await request(app).post("/sessions").set("authorization", `Bearer ${token}`).send({ availabilityBlockId: "b1" });
  expect(res.status).toBe(403);
  expect(res.body.code).toBe("STUDENT_SUSPENDED");
});
