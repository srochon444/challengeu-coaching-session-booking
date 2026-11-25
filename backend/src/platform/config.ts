import { fileURLToPath } from "node:url";

// Resolve the default DB path relative to this file (the backend package),
// so it is the same whether run from the repo root or the backend workspace.
const defaultDbPath = fileURLToPath(new URL("../../data/dev.sqlite", import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret",
  dbPath: process.env.DB_PATH ?? defaultDbPath,
};
