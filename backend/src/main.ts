import { existsSync, rmSync } from "node:fs";
import { createDb } from "./platform/db.js";
import { SystemClock } from "./platform/clock.js";
import { config } from "./platform/config.js";
import { buildApp } from "./test-support/app.js";
import { seed } from "./seed.js";

// Dev convenience: fresh DB + seed on every boot so reviewers get data from one command.
// Clear the WAL/SHM sidecars too, or SQLite reads a stale/corrupt state.
if (config.dbPath !== ":memory:") {
  for (const suffix of ["", "-wal", "-shm"]) {
    if (existsSync(config.dbPath + suffix)) rmSync(config.dbPath + suffix);
  }
}
seed(config.dbPath);

const { db } = createDb(config.dbPath);
const { app } = buildApp(db, SystemClock);
app.listen(config.port, () => console.log(`API on http://localhost:${config.port}`));
