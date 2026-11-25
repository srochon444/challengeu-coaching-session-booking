import type { Db } from "../../platform/db.js";
import type { Clock } from "../../platform/clock.js";
import type { EventBus } from "../../platform/event-bus.js";
import type { UserRepo } from "../identity/ports.js";
import type { EnrollmentPort } from "../enrollment/ports.js";
import { drizzleBlockRepo, drizzleSessionRepo } from "./repo.js";
import { bookingRoutes } from "./routes.js";

export function createBookingModule(db: Db, users: UserRepo, enrollment: EnrollmentPort, bus: EventBus, clock: Clock) {
  const blocks = drizzleBlockRepo(db);
  const sessions = drizzleSessionRepo(db);
  const router = bookingRoutes({ blocks, sessions, users, enrollment, bus, clock });
  return { router, blocks, sessions };
}
