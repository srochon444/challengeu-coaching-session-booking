import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { createIdentityModule } from "./index.js";

test("createAccount persists and getUser returns it", () => {
  const { db } = createDb(":memory:");
  const { api } = createIdentityModule(db, new FixedClock("2026-01-01T00:00:00.000Z"));
  const u = api.createAccount({ displayName: "Ada", role: "student", timezone: "Europe/Paris" });
  expect(u.id).toBeTruthy();
  expect(api.getUser(u.id)).toMatchObject({ displayName: "Ada", role: "student", timezone: "Europe/Paris" });
});
