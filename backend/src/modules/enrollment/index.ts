import type { Db } from "../../platform/db.js";
import type { Clock } from "../../platform/clock.js";
import type { IdentityApi } from "../identity/ports.js";
import { drizzleEnrollmentRepo } from "./repo.js";
import { enrollmentService } from "./service.js";

// Slice 3: exposes the EnrollmentPort (Booking depends on it) + the service used
// by the seed. HTTP routes (register/suspend/reactivate) arrive in Slice 6.
export function createEnrollmentModule(db: Db, identity: IdentityApi, clock: Clock) {
  const service = enrollmentService(drizzleEnrollmentRepo(db), identity, clock);
  return { port: service.port, service };
}
