import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import { createDb } from "./platform/db.js";
import { SystemClock } from "./platform/clock.js";
import { config } from "./platform/config.js";
import { createIdentityModule } from "./modules/identity/index.js";
import { createEnrollmentModule } from "./modules/enrollment/index.js";
import { drizzleBlockRepo } from "./modules/booking/repo.js";
import type { BlockRow } from "./modules/booking/ports.js";

// Seed grows with each delivery slice.
// Slice 1: users. Slice 2: launch-relative availability (~20 upcoming blocks/coach,
// Mon–Fri, 08:00–17:00 in the coach's own timezone, varied by coach, no overlaps).
const COACHES: Array<{ name: string; tz: string }> = [
  { name: "Coach Alice (Toronto)", tz: "America/Toronto" },
  { name: "Coach Bruno (Vancouver)", tz: "America/Vancouver" },
  { name: "Coach Chloé (Paris)", tz: "Europe/Paris" },
];

const STUDENTS: Array<{ name: string; tz: string; suspended?: boolean }> = [
  { name: "Student Dani", tz: "America/Toronto" },
  { name: "Student Evan", tz: "America/Vancouver" },
  { name: "Student Farah", tz: "Europe/Paris" },
  { name: "Student Gabriel", tz: "America/Toronto" },
  { name: "Student Hana", tz: "America/Vancouver" },
  { name: "Student Igor (suspended)", tz: "Europe/Paris", suspended: true },
  { name: "Student Jules", tz: "America/Toronto" },
];

const BLOCKS_PER_COACH = 20;

// Build upcoming weekday availability for one coach, in their timezone, starting
// from "now". Two slots per weekday (a morning + an afternoon one), hours shifted
// by the coach index so coaches differ, durations alternating 30/60, all within
// 08:00–17:00 and strictly in the future.
function blocksForCoach(coachUserId: string, tz: string, coachIndex: number, now: Date, createdAt: string): BlockRow[] {
  const nowMs = now.getTime();
  const rows: BlockRow[] = [];
  let day = DateTime.fromMillis(nowMs).setZone(tz).startOf("day");

  for (let d = 0; d < 28 && rows.length < BLOCKS_PER_COACH; d++, day = day.plus({ days: 1 })) {
    if (day.weekday > 5) continue; // 1=Mon … 5=Fri; skip weekends
    const hours = [8 + ((coachIndex + d) % 3), 13 + ((coachIndex + d) % 3)]; // morning 8–10, afternoon 13–15
    hours.forEach((hour, k) => {
      if (rows.length >= BLOCKS_PER_COACH) return;
      const durationMin = ((coachIndex + d + k) % 2 === 0 ? 30 : 60) as 30 | 60;
      const start = day.set({ hour, minute: 0, second: 0, millisecond: 0 });
      const end = start.plus({ minutes: durationMin });
      if (start.toMillis() <= nowMs) return;                        // upcoming only
      if (end.hour > 17 || (end.hour === 17 && end.minute > 0)) return; // within business hours
      rows.push({
        id: randomUUID(), coachUserId, durationMin,
        startsAtUtc: start.toUTC().toISO()!, endsAtUtc: end.toUTC().toISO()!, createdAt,
      });
    });
  }
  return rows;
}

export function seed(dbPath: string) {
  const { db } = createDb(dbPath);
  const identity = createIdentityModule(db, SystemClock).api;
  const enrollment = createEnrollmentModule(db, identity, SystemClock).service;
  const blocks = drizzleBlockRepo(db);
  const now = SystemClock.now();
  const createdAt = now.toISOString();

  let blockCount = 0;
  COACHES.forEach((c, i) => {
    const coach = identity.createAccount({ displayName: c.name, role: "coach", timezone: c.tz });
    const rows = blocksForCoach(coach.id, c.tz, i, now, createdAt);
    rows.forEach((r) => blocks.insert(r));
    blockCount += rows.length;
  });

  // Students are registered through Enrollment (which owns their account + status).
  let suspendedCount = 0;
  for (const s of STUDENTS) {
    const student = enrollment.register(s.name, s.tz);
    if (s.suspended) { enrollment.setStatus(student.studentUserId, "suspended"); suspendedCount += 1; }
  }
  identity.createAccount({ displayName: "Enrollment Admin", role: "enrollment_admin", timezone: "America/Toronto" });

  console.log(`Seeded: ${COACHES.length} coaches (${blockCount} availability blocks), ${STUDENTS.length} students (${suspendedCount} suspended), 1 enrollment admin.`);
}

// Run standalone: `npm run seed`
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seed(config.dbPath);
}
