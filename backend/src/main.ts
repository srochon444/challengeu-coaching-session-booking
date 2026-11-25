import { existsSync, rmSync } from "node:fs";
import { createDb } from "./platform/db.js";
import { SystemClock } from "./platform/clock.js";
import { config } from "./platform/config.js";
import { buildApp } from "./test-support/app.js";
import { seed } from "./seed.js";

// Dev convenience: fresh DB + seed on every boot so reviewers get data from one command.
if (config.dbPath !== ":memory:" && existsSync(config.dbPath)) rmSync(config.dbPath);
seed(config.dbPath);

const { db } = createDb(config.dbPath);
const { app } = buildApp(db, SystemClock);
app.listen(config.port, () => console.log(`API on http://localhost:${config.port}`));
