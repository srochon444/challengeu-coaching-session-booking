import { expect, test } from "vitest";
import request from "supertest";
import { createApp, mountErrorMapper } from "./http.js";
import { SlotTaken } from "./errors.js";

test("maps a DomainError to its status + code", async () => {
  const app = createApp();
  app.get("/boom", (_req, _res, next) => next(new SlotTaken()));
  mountErrorMapper(app);
  const res = await request(app).get("/boom");
  expect(res.status).toBe(409);
  expect(res.body).toEqual({ code: "SLOT_TAKEN", message: expect.any(String) });
});
