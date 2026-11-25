import type { DurationMinutes } from "@ccu/shared";

export interface BlockRow {
  id: string; coachUserId: string; startsAtUtc: string; endsAtUtc: string; durationMin: DurationMinutes; createdAt: string;
}

export interface AvailabilityBlockRepo {
  insert(b: BlockRow): void;
  byId(id: string): BlockRow | undefined;
  byCoachInRange(coachId: string, fromUtc: string, toUtc: string): BlockRow[];
  delete(id: string): void;
  hasConfirmedSession(blockId: string): boolean;
}
