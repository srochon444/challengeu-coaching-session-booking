import { randomUUID } from "node:crypto";
import type { Role } from "@ccu/shared";
import type { Clock } from "../../platform/clock.js";
import { NotFound } from "../../platform/errors.js";
import type { IdentityApi, UserRepo } from "./ports.js";
import { toDTO } from "./ports.js";

export function identityService(repo: UserRepo, clock: Clock): IdentityApi {
  return {
    createAccount({ displayName, role, timezone }: { displayName: string; role: Role; timezone: string }) {
      const row = { id: randomUUID(), displayName, role, timezone, createdAt: clock.now().toISOString() };
      repo.insert(row);
      return toDTO(row);
    },
    getUser(id) {
      const row = repo.byId(id);
      if (!row) throw new NotFound("User");
      return toDTO(row);
    },
  };
}
