import { randomUUID } from "node:crypto";
import { addMinutesIso } from "@ccu/shared";
import type { AvailabilityBlockDTO } from "@ccu/shared";
import type { Clock } from "../../../platform/clock.js";
import { BlockOverlap, PastAvailability } from "../../../platform/errors.js";
import { Duration } from "../domain/duration.js";
import { blocksOverlap, isInFuture } from "../domain/rules.js";
import type { AvailabilityBlockRepo } from "../ports.js";

export function makePublishAvailability(deps: { blocks: AvailabilityBlockRepo; clock: Clock }) {
  return function publish(input: { coachUserId: string; startsAtUtc: string; durationMin: 30 | 60 }): AvailabilityBlockDTO {
    const durationMin = Duration.of(input.durationMin);
    const startsAtUtc = new Date(input.startsAtUtc).toISOString();
    if (!isInFuture(startsAtUtc, deps.clock.now())) throw new PastAvailability();
    const endsAtUtc = addMinutesIso(startsAtUtc, durationMin);
    // Look at the block's own day to find overlaps cheaply.
    const dayFrom = startsAtUtc.slice(0, 10) + "T00:00:00.000Z";
    const dayTo = addMinutesIso(dayFrom, 24 * 60);
    const existing = deps.blocks.byCoachInRange(input.coachUserId, dayFrom, dayTo);
    if (existing.some((b) => blocksOverlap(b, { startsAtUtc, endsAtUtc }))) throw new BlockOverlap();
    const row = { id: randomUUID(), coachUserId: input.coachUserId, startsAtUtc, endsAtUtc, durationMin, createdAt: deps.clock.now().toISOString() };
    deps.blocks.insert(row);
    return { id: row.id, coachUserId: row.coachUserId, startsAtUtc, endsAtUtc, durationMin };
  };
}
