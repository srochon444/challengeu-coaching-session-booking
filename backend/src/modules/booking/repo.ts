import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Db } from "../../platform/db.js";
import { availabilityBlocks, sessions } from "../../platform/schema.js";
import type { AvailabilityBlockRepo, BlockRow } from "./ports.js";

export function drizzleBlockRepo(db: Db): AvailabilityBlockRepo {
  return {
    insert: (b) => { db.insert(availabilityBlocks).values(b).run(); },
    byId: (id) => db.select().from(availabilityBlocks).where(eq(availabilityBlocks.id, id)).get() as BlockRow | undefined,
    byCoachInRange: (coachId, from, to) =>
      db.select().from(availabilityBlocks)
        .where(and(eq(availabilityBlocks.coachUserId, coachId), gte(availabilityBlocks.startsAtUtc, from), lt(availabilityBlocks.startsAtUtc, to)))
        .orderBy(availabilityBlocks.startsAtUtc)
        .all() as BlockRow[],
    delete: (id) => { db.delete(availabilityBlocks).where(eq(availabilityBlocks.id, id)).run(); },
    hasConfirmedSession: (blockId) =>
      ((db.select({ c: sql<number>`count(*)` }).from(sessions)
        .where(and(eq(sessions.availabilityBlockId, blockId), eq(sessions.status, "confirmed")))
        .get()?.c) ?? 0) > 0,
  };
}
