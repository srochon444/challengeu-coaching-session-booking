import { Router } from "express";
import { z } from "zod";
import type { AvailabilityBlockDTO } from "@ccu/shared";
import { requireAuth, requireRole } from "../../platform/auth.js";
import type { Clock } from "../../platform/clock.js";
import type { AvailabilityBlockRepo, BlockRow } from "./ports.js";
import { makePublishAvailability } from "./application/publish-availability.js";

const toBlockDTO = (b: BlockRow): AvailabilityBlockDTO => ({
  id: b.id, coachUserId: b.coachUserId, startsAtUtc: b.startsAtUtc, endsAtUtc: b.endsAtUtc, durationMin: b.durationMin,
});

export function bookingRoutes(deps: { blocks: AvailabilityBlockRepo; clock: Clock }): Router {
  const publish = makePublishAvailability({ blocks: deps.blocks, clock: deps.clock });
  const r = Router();

  r.post("/availability-blocks", requireAuth, requireRole("coach"), (req, res) => {
    const body = z.object({ startsAtUtc: z.string(), durationMin: z.union([z.literal(30), z.literal(60)]) }).parse(req.body);
    res.status(201).json(publish({ coachUserId: req.principal!.userId, ...body }));
  });

  r.get("/availability-blocks", requireAuth, (req, res) => {
    const q = z.object({ coachId: z.string(), fromUtc: z.string(), toUtc: z.string() }).parse(req.query);
    res.json(deps.blocks.byCoachInRange(q.coachId, q.fromUtc, q.toUtc).map(toBlockDTO));
  });

  return r;
}
