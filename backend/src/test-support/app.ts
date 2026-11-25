import type { Db } from "../platform/db.js";
import type { Clock } from "../platform/clock.js";
import { createApp, mountErrorMapper } from "../platform/http.js";
import { InMemoryEventBus } from "../platform/event-bus.js";
import { createIdentityModule } from "../modules/identity/index.js";
import { createBookingModule } from "../modules/booking/index.js";

// Composition root (test + dev share this). Modules are wired here only;
// each delivery slice extends this function as it introduces a module.
export function buildApp(db: Db, clock: Clock) {
  const bus = new InMemoryEventBus();
  const identity = createIdentityModule(db, clock);
  const booking = createBookingModule(db, clock);

  const app = createApp();
  app.use(identity.router);
  app.use(booking.router);
  mountErrorMapper(app);
  return { app, bus, identity, booking };
}
