import { AvailabilityBooked, Forbidden, NotFound } from "../../../platform/errors.js";
import type { AvailabilityBlockRepo } from "../ports.js";

export function makeRemoveAvailability(deps: { blocks: AvailabilityBlockRepo }) {
  return function remove(input: { blockId: string; coachUserId: string }): void {
    const block = deps.blocks.byId(input.blockId);
    if (!block) throw new NotFound("Availability block");
    if (block.coachUserId !== input.coachUserId) throw new Forbidden();
    // A slot a student has booked cannot be pulled out from under them.
    if (deps.blocks.hasConfirmedSession(block.id)) throw new AvailabilityBooked();
    deps.blocks.delete(block.id);
  };
}
