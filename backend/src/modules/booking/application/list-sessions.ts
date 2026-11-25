import type { SessionDTO } from "@ccu/shared";
import type { Clock } from "../../../platform/clock.js";
import type { SessionRepo } from "../ports.js";

export function makeListSessions(deps: { sessions: SessionRepo; clock: Clock }) {
  return function list(input: { userId: string }): SessionDTO[] {
    return deps.sessions.listForUserUpcoming(input.userId, deps.clock.now().toISOString())
      .map((s) => ({ id: s.id, availabilityBlockId: s.availabilityBlockId, studentUserId: s.studentUserId, coachUserId: s.coachUserId, startsAtUtc: s.startsAtUtc, endsAtUtc: s.endsAtUtc, status: s.status }));
  };
}
