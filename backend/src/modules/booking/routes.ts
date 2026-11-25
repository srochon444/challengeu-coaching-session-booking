import { Router } from "express";
import { z } from "zod";
import type { AvailabilityBlockDTO } from "@ccu/shared";
import { requireAuth, requireRole } from "../../platform/auth.js";
import { asyncHandler } from "../../platform/http.js";
import type { Clock } from "../../platform/clock.js";
import type { EventBus } from "../../platform/event-bus.js";
import type { UserRepo } from "../identity/ports.js";
import { toDTO } from "../identity/ports.js";
import type { AvailabilityBlockRepo, BlockRow, EnrollmentPort, SessionRepo } from "./ports.js";
import { makePublishAvailability } from "./application/publish-availability.js";
import { makeRemoveAvailability } from "./application/remove-availability.js";
import { makeBookSession } from "./application/book-session.js";
import { makeListOpenBlocks } from "./application/list-open-blocks.js";
import { makeListSessions } from "./application/list-sessions.js";

const toBlockDTO = (b: BlockRow): AvailabilityBlockDTO => ({
  id: b.id, coachUserId: b.coachUserId, startsAtUtc: b.startsAtUtc, endsAtUtc: b.endsAtUtc, durationMin: b.durationMin,
});

export function bookingRoutes(deps: {
  blocks: AvailabilityBlockRepo; sessions: SessionRepo; users: UserRepo; enrollment: EnrollmentPort; bus: EventBus; clock: Clock;
}): Router {
  const publish = makePublishAvailability({ blocks: deps.blocks, clock: deps.clock });
  const remove = makeRemoveAvailability({ blocks: deps.blocks });
  const book = makeBookSession({ blocks: deps.blocks, sessions: deps.sessions, enrollment: deps.enrollment, bus: deps.bus, clock: deps.clock });
  const listOpen = makeListOpenBlocks({ blocks: deps.blocks });
  const listSessions = makeListSessions({ sessions: deps.sessions, clock: deps.clock });
  const r = Router();

  // --- Coach: availability ---
  r.post("/availability-blocks", requireAuth, requireRole("coach"), (req, res) => {
    const body = z.object({ startsAtUtc: z.string(), durationMin: z.union([z.literal(30), z.literal(60)]) }).parse(req.body);
    res.status(201).json(publish({ coachUserId: req.principal!.userId, ...body }));
  });
  r.get("/availability-blocks", requireAuth, (req, res) => {
    const q = z.object({ coachId: z.string(), fromUtc: z.string(), toUtc: z.string() }).parse(req.query);
    res.json(deps.blocks.byCoachInRange(q.coachId, q.fromUtc, q.toUtc).map(toBlockDTO));
  });
  r.delete("/availability-blocks/:id", requireAuth, requireRole("coach"), (req, res) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    remove({ blockId: id, coachUserId: req.principal!.userId });
    res.status(204).end();
  });

  // --- Student: discovery + booking ---
  r.get("/coaches", requireAuth, (_req, res) => res.json(deps.users.all().filter((u) => u.role === "coach").map(toDTO)));
  r.get("/coaches/:id/open-blocks", requireAuth, (req, res) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const q = z.object({ fromUtc: z.string(), toUtc: z.string() }).parse(req.query);
    res.json(listOpen({ coachUserId: id, ...q }));
  });
  r.post("/sessions", requireAuth, requireRole("student"), asyncHandler(async (req, res) => {
    const { availabilityBlockId } = z.object({ availabilityBlockId: z.string() }).parse(req.body);
    res.status(201).json(await book({ studentUserId: req.principal!.userId, availabilityBlockId }));
  }));
  r.get("/sessions", requireAuth, (req, res) => res.json(listSessions({ userId: req.principal!.userId })));

  return r;
}
