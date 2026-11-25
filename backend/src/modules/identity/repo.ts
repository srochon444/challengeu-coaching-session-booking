import { eq } from "drizzle-orm";
import type { Db } from "../../platform/db.js";
import { users } from "../../platform/schema.js";
import type { UserRepo, UserRow } from "./ports.js";

export function drizzleUserRepo(db: Db): UserRepo {
  return {
    insert: (u) => { db.insert(users).values(u).run(); },
    byId: (id) => db.select().from(users).where(eq(users.id, id)).get() as UserRow | undefined,
    all: () => db.select().from(users).all() as UserRow[],
  };
}
