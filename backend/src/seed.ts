import { createDb } from "./platform/db.js";
import { SystemClock } from "./platform/clock.js";
import { config } from "./platform/config.js";
import { createIdentityModule } from "./modules/identity/index.js";

// Seed grows with each delivery slice.
// Slice 1: 3 coaches, 7 students, 1 enrollment admin — spread across Toronto/Vancouver/Paris.
const COACHES: Array<{ name: string; tz: string }> = [
  { name: "Coach Alice (Toronto)", tz: "America/Toronto" },
  { name: "Coach Bruno (Vancouver)", tz: "America/Vancouver" },
  { name: "Coach Chloé (Paris)", tz: "Europe/Paris" },
];

const STUDENTS: Array<{ name: string; tz: string }> = [
  { name: "Student Dani", tz: "America/Toronto" },
  { name: "Student Evan", tz: "America/Vancouver" },
  { name: "Student Farah", tz: "Europe/Paris" },
  { name: "Student Gabriel", tz: "America/Toronto" },
  { name: "Student Hana", tz: "America/Vancouver" },
  { name: "Student Igor", tz: "Europe/Paris" },
  { name: "Student Jules", tz: "America/Toronto" },
];

export function seed(dbPath: string) {
  const { db } = createDb(dbPath);
  const identity = createIdentityModule(db, SystemClock).api;

  for (const c of COACHES) identity.createAccount({ displayName: c.name, role: "coach", timezone: c.tz });
  for (const s of STUDENTS) identity.createAccount({ displayName: s.name, role: "student", timezone: s.tz });
  identity.createAccount({ displayName: "Enrollment Admin", role: "enrollment_admin", timezone: "America/Toronto" });

  console.log(`Seeded: ${COACHES.length} coaches, ${STUDENTS.length} students, 1 enrollment admin.`);
}

// Run standalone: `npm run seed`
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seed(config.dbPath);
}
