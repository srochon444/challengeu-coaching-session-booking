import { eq } from "drizzle-orm";
import type { Db } from "../../platform/db.js";
import { enrollments } from "../../platform/schema.js";
import type { EnrollmentRepo, EnrollmentRow } from "./ports.js";

export function drizzleEnrollmentRepo(db: Db): EnrollmentRepo {
  return {
    insert: (e) => { db.insert(enrollments).values(e).run(); },
    byStudent: (sid) => db.select().from(enrollments).where(eq(enrollments.studentUserId, sid)).get() as EnrollmentRow | undefined,
    setStatus: (sid, status, at) => { db.update(enrollments).set({ status, updatedAt: at }).where(eq(enrollments.studentUserId, sid)).run(); },
    all: () => db.select().from(enrollments).all() as EnrollmentRow[],
  };
}
