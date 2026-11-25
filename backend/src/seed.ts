import { createDb } from "./platform/db.js";
import { SystemClock } from "./platform/clock.js";
import { createIdentityModule } from "./modules/identity/index.js";

// Seed grows with each delivery slice. Slice 1: a coach, a student, an admin.
export function seed(dbPath: string) {
  const { db } = createDb(dbPath);
  const identity = createIdentityModule(db, SystemClock).api;

  identity.createAccount({ displayName: "Coach Toronto", role: "coach", timezone: "America/Toronto" });
  identity.createAccount({ displayName: "Student Sample", role: "student", timezone: "America/Vancouver" });
  identity.createAccount({ displayName: "Enrollment Admin", role: "enrollment_admin", timezone: "America/Toronto" });

  console.log("Seeded: 1 coach, 1 student, 1 enrollment admin.");
}

// Run standalone: `npm run seed`
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seed(process.env.DB_PATH ?? "backend/data/dev.sqlite");
}
