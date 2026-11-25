import type { Db } from "../../platform/db.js";
import type { Clock } from "../../platform/clock.js";
import { drizzleUserRepo } from "./repo.js";
import { identityService } from "./service.js";
import { identityRoutes } from "./routes.js";

export function createIdentityModule(db: Db, clock: Clock) {
  const repo = drizzleUserRepo(db);
  const api = identityService(repo, clock);
  const router = identityRoutes(repo);
  return { api, router, repo };
}
