import { randomUUID } from "node:crypto";
import type { SessionDTO } from "@ccu/shared";
import type { Clock } from "../../../platform/clock.js";
import type { EventBus } from "../../../platform/event-bus.js";
import { MaxUpcomingReached, NotFound, StudentSuspended } from "../../../platform/errors.js";
import { MAX_UPCOMING } from "../domain/rules.js";
import { SESSION_BOOKED, type SessionEvent } from "../events.js";
import type { AvailabilityBlockRepo, EnrollmentPort, SessionRepo } from "../ports.js";

export function makeBookSession(deps: {
  blocks: AvailabilityBlockRepo; sessions: SessionRepo; enrollment: EnrollmentPort; bus: EventBus; clock: Clock;
}) {
  return async function book(input: { studentUserId: string; availabilityBlockId: string }): Promise<SessionDTO> {
    const block = deps.blocks.byId(input.availabilityBlockId);
    if (!block) throw new NotFound("Availability block");
    if (!(await deps.enrollment.canBook(input.studentUserId))) throw new StudentSuspended();
    const nowIso = deps.clock.now().toISOString();
    if (deps.sessions.countUpcomingForStudent(input.studentUserId, nowIso) >= MAX_UPCOMING) throw new MaxUpcomingReached();

    const row = {
      id: randomUUID(), availabilityBlockId: block.id, studentUserId: input.studentUserId, coachUserId: block.coachUserId,
      startsAtUtc: block.startsAtUtc, endsAtUtc: block.endsAtUtc, status: "confirmed" as const, createdAt: nowIso, cancelledAt: null,
    };
    deps.sessions.insertConfirmed(row); // throws SlotTaken on the unique index — the hard guarantee

    const evt: SessionEvent = { sessionId: row.id, studentUserId: row.studentUserId, coachUserId: row.coachUserId, startsAtUtc: row.startsAtUtc };
    deps.bus.publish(SESSION_BOOKED, evt);
    return { id: row.id, availabilityBlockId: row.availabilityBlockId, studentUserId: row.studentUserId, coachUserId: row.coachUserId, startsAtUtc: row.startsAtUtc, endsAtUtc: row.endsAtUtc, status: "confirmed" };
  };
}
