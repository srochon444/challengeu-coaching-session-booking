import { and, eq, gte, lt, or, sql, notExists } from "drizzle-orm";
import type { Db } from "../../platform/db.js";
import { availabilityBlocks, sessions } from "../../platform/schema.js";
import { SlotTaken } from "../../platform/errors.js";
import type { AvailabilityBlockRepo, BlockRow, SessionRepo, SessionRow } from "./ports.js";

export function drizzleBlockRepo(db: Db): AvailabilityBlockRepo {
  return {
    insert: (b) => { db.insert(availabilityBlocks).values(b).run(); },
    byId: (id) => db.select().from(availabilityBlocks).where(eq(availabilityBlocks.id, id)).get() as BlockRow | undefined,
    byCoachInRange: (coachId, from, to) =>
      db.select().from(availabilityBlocks)
        .where(and(eq(availabilityBlocks.coachUserId, coachId), gte(availabilityBlocks.startsAtUtc, from), lt(availabilityBlocks.startsAtUtc, to)))
        .orderBy(availabilityBlocks.startsAtUtc)
        .all() as BlockRow[],
    openInRange: (coachId, from, to) =>
      db.select().from(availabilityBlocks)
        .where(and(
          eq(availabilityBlocks.coachUserId, coachId),
          gte(availabilityBlocks.startsAtUtc, from),
          lt(availabilityBlocks.startsAtUtc, to),
          notExists(
            db.select({ one: sql`1` }).from(sessions)
              .where(and(eq(sessions.availabilityBlockId, availabilityBlocks.id), eq(sessions.status, "confirmed"))),
          ),
        ))
        .orderBy(availabilityBlocks.startsAtUtc)
        .all() as BlockRow[],
    delete: (id) => { db.delete(availabilityBlocks).where(eq(availabilityBlocks.id, id)).run(); },
    hasConfirmedSession: (blockId) =>
      ((db.select({ c: sql<number>`count(*)` }).from(sessions)
        .where(and(eq(sessions.availabilityBlockId, blockId), eq(sessions.status, "confirmed")))
        .get()?.c) ?? 0) > 0,
  };
}

export function drizzleSessionRepo(db: Db): SessionRepo {
  return {
    insertConfirmed: (s) => {
      try { db.insert(sessions).values(s).run(); }
      catch (e) {
        if (e instanceof Error && /UNIQUE/i.test(e.message)) throw new SlotTaken();
        throw e;
      }
    },
    countUpcomingForStudent: (studentId, nowIso) =>
      (db.select({ c: sql<number>`count(*)` }).from(sessions)
        .where(and(eq(sessions.studentUserId, studentId), eq(sessions.status, "confirmed"), gte(sessions.startsAtUtc, nowIso)))
        .get()?.c) ?? 0,
    byId: (id) => db.select().from(sessions).where(eq(sessions.id, id)).get() as SessionRow | undefined,
    cancel: (id, at) => { db.update(sessions).set({ status: "cancelled", cancelledAt: at }).where(eq(sessions.id, id)).run(); },
    listForUserUpcoming: (userId, nowIso) =>
      db.select().from(sessions)
        .where(and(
          or(eq(sessions.studentUserId, userId), eq(sessions.coachUserId, userId)),
          eq(sessions.status, "confirmed"),
          gte(sessions.startsAtUtc, nowIso),
        ))
        .orderBy(sessions.startsAtUtc)
        .all() as SessionRow[],
  };
}
