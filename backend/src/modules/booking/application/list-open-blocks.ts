import type { AvailabilityBlockDTO } from "@ccu/shared";
import type { AvailabilityBlockRepo } from "../ports.js";

export function makeListOpenBlocks(deps: { blocks: AvailabilityBlockRepo }) {
  return function list(input: { coachUserId: string; fromUtc: string; toUtc: string }): AvailabilityBlockDTO[] {
    return deps.blocks.openInRange(input.coachUserId, input.fromUtc, input.toUtc)
      .map((b) => ({ id: b.id, coachUserId: b.coachUserId, startsAtUtc: b.startsAtUtc, endsAtUtc: b.endsAtUtc, durationMin: b.durationMin }));
  };
}
