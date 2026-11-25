import { AvailabilityBooked, Forbidden, NotFound } from "../../../platform/errors.js";
import type { AvailabilityBlockRepo, SessionRepo } from "../ports.js";

export function makeRemoveAvailability(deps: { blocks: AvailabilityBlockRepo; sessions: SessionRepo }) {
  return function remove(input: { blockId: string; coachUserId: string }): void {
    const block = deps.blocks.byId(input.blockId);
    if (!block) throw new NotFound("Availability block");
    if (block.coachUserId !== input.coachUserId) throw new Forbidden();
    // A slot a student has booked cannot be pulled out from under them.
    if (deps.blocks.hasConfirmedSession(block.id)) throw new AvailabilityBooked();
    // Any remaining sessions are cancelled history; clear them so the FK allows deletion.
    deps.sessions.deleteForBlock(block.id);
    deps.blocks.delete(block.id);
  };
}
