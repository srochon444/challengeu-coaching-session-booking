import type { DurationMinutes } from "@ccu/shared";

export interface BlockRow {
  id: string; coachUserId: string; startsAtUtc: string; endsAtUtc: string; durationMin: DurationMinutes; createdAt: string;
}
export interface SessionRow {
  id: string; availabilityBlockId: string; studentUserId: string; coachUserId: string;
  startsAtUtc: string; endsAtUtc: string; status: "confirmed" | "cancelled"; createdAt: string; cancelledAt: string | null;
}

export interface AvailabilityBlockRepo {
  insert(b: BlockRow): void;
  byId(id: string): BlockRow | undefined;
  byCoachInRange(coachId: string, fromUtc: string, toUtc: string): BlockRow[];
  openInRange(coachId: string, fromUtc: string, toUtc: string): BlockRow[]; // no confirmed session
  delete(id: string): void;
  hasConfirmedSession(blockId: string): boolean;
}

export interface SessionRepo {
  insertConfirmed(s: SessionRow): void; // throws SlotTaken on the unique-index violation
  countUpcomingForStudent(studentId: string, nowIso: string): number;
  byId(id: string): SessionRow | undefined;
  cancel(id: string, at: string): void;
  listForUserUpcoming(userId: string, nowIso: string): SessionRow[];
}

export type { EnrollmentPort } from "../enrollment/ports.js";
