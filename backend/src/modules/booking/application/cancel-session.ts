import type { Clock } from "../../../platform/clock.js";
import type { EventBus } from "../../../platform/event-bus.js";
import { CancelWindowPassed, Forbidden, NotFound } from "../../../platform/errors.js";
import { canCancel } from "../domain/rules.js";
import { SESSION_CANCELLED, type SessionEvent } from "../events.js";
import type { SessionRepo } from "../ports.js";

export function makeCancelSession(deps: { sessions: SessionRepo; bus: EventBus; clock: Clock }) {
  return function cancel(input: { sessionId: string; requesterUserId: string }): void {
    const s = deps.sessions.byId(input.sessionId);
    if (!s || s.status !== "confirmed") throw new NotFound("Session");
    if (s.studentUserId !== input.requesterUserId) throw new Forbidden();
    if (!canCancel(s.startsAtUtc, deps.clock.now())) throw new CancelWindowPassed();
    deps.sessions.cancel(s.id, deps.clock.now().toISOString());
    const evt: SessionEvent = { sessionId: s.id, studentUserId: s.studentUserId, coachUserId: s.coachUserId, startsAtUtc: s.startsAtUtc };
    deps.bus.publish(SESSION_CANCELLED, evt);
  };
}
