import { expect, test } from "vitest";
import request from "supertest";
import { createApp, mountErrorMapper } from "./http.js";
import { signToken, requireAuth, requireRole } from "./auth.js";

test("requireRole allows the right role and blocks others", async () => {
  const app = createApp();
  app.get("/coach-only", requireAuth, requireRole("coach"), (req, res) => res.json({ ok: req.principal!.userId }));
  mountErrorMapper(app);
  const coach = signToken({ userId: "c1", role: "coach" });
  const student = signToken({ userId: "s1", role: "student" });
  expect((await request(app).get("/coach-only").set("authorization", `Bearer ${coach}`)).status).toBe(200);
  expect((await request(app).get("/coach-only").set("authorization", `Bearer ${student}`)).status).toBe(403);
  expect((await request(app).get("/coach-only")).status).toBe(401);
});
