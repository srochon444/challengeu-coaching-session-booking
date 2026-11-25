import type { Db } from "../../platform/db.js";
import type { Clock } from "../../platform/clock.js";
import { drizzleBlockRepo } from "./repo.js";
import { bookingRoutes } from "./routes.js";

// Slice 2: coach availability. The module grows (sessions, cancel, booking) in later slices.
export function createBookingModule(db: Db, clock: Clock) {
  const blocks = drizzleBlockRepo(db);
  const router = bookingRoutes({ blocks, clock });
  return { router, blocks };
}
