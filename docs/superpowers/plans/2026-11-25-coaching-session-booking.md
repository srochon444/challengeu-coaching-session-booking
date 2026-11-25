# Coaching Session Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a coaching-session booking app (coaches publish availability, students book/cancel across timezones, enrollment team manages access, in-app notifications) as a modular monolith.

**Architecture:** One deployable app, four bounded-context backend modules (identity, booking [core], enrollment, notifications) with hard boundaries — cross-module sync reads go through query **ports**, reactions go through **domain events** on an in-process bus. No double-booking is enforced by a DB partial unique index. The server stores/reasons only in UTC; the React client converts to each user's timezone at the edges.

**Tech Stack:** TypeScript (strict), Node 22, Express, Drizzle ORM + better-sqlite3, jsonwebtoken, zod, Luxon; React + Vite + @tanstack/react-query + react-router-dom; Vitest + supertest. npm workspaces.

**Spec:** `docs/superpowers/specs/2026-11-25-coaching-session-booking-design.md`

## Global Constraints

- **TypeScript strict mode** everywhere (`"strict": true`), backend and frontend.
- **Server speaks only UTC** — all persisted/transported timestamps are UTC ISO-8601 strings. No timezone logic in `domain/` or the DB.
- **Module isolation** — a module may import another module only through its `ports/` interfaces or the event bus; never another module's `domain/` or `adapters/`. Only `backend/src/main.ts` imports concrete adapters from all modules.
- **Dependencies point inward** — `domain/` imports nothing external; `application/` imports `domain/` + `ports/`; `adapters/` implement `ports/`.
- **Node 22 LTS** (`.nvmrc` = `22`). Package manager: **npm workspaces**.
- **TDD** — every behavior starts with a failing test. **Commit after every green task.** Do not squash.
- **Role enum** value is exactly `'coach' | 'student' | 'enrollment_admin'`. **Session status** is exactly `'confirmed' | 'cancelled'`. **Durations** are exactly `30 | 60` (minutes). **MAX_UPCOMING = 3**. **Cancellation window = 24 hours**.

---

## Delivery Slices & Branch Workflow

**We build in vertical slices, not layers.** Each slice ships a full-stack, 100%-working, demoable feature. Stop after any slice and everything built still works end to end. The detailed `## Task N` sections below are the implementation library; each slice composes specific tasks (and, for the frontend tasks that span slices, specific files).

**Git workflow — every slice:**
1. `git checkout main && git pull` then `git checkout -b <branch>`.
2. Implement the slice's tasks in order (TDD; commit after each green task, as the task steps show).
3. `git push -u origin <branch>`.
4. `gh pr create --base main --title "<slice title>" --body "<what it delivers + demo steps>"`.
5. **STOP.** Author reviews & merges the PR on GitHub.
6. On "continue": back to step 1 for the next slice off updated `main`.

(GitHub calls these Pull Requests; functionally the "MR to main" review gate requested.)

### Slice 1 — Foundation + auth → `feat/foundation-and-auth`
- **Backend/shared:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7.
- **Frontend:** Task 16 (scaffold, api client, auth context, login picker, role-gated shell).
- **Seed:** minimal — create `backend/src/seed.ts` with a coach, a student, and an enrollment_admin (no blocks yet); wire dev boot (`main.ts`) as in Task 15 steps 1,3 but seeding only users. Add the API smoke test skeleton later.
- **Demo acceptance:** `npm run dev` → open the app → pick a seeded user → "Signed in as X (role, timezone)". `npm test` green.

### Slice 2 — Coach availability → `feat/coach-availability`
- **Backend:** Task 9 (duration + rules), Task 10 (repos/ports/events — block repo portion), Task 11 (publish use-case + test). Add a `POST /availability-blocks` + `GET /availability-blocks` route (the coach routes from Task 13's `routes.ts`, availability endpoints only) and mount via a minimal booking module.
- **Frontend:** Task 17 steps 1–3, 8 (availability `api.ts`, `PublishForm`, `MyBlocks`, wire coach panel).
- **Seed:** extend `seed.ts` to 3 coaches (Toronto/Vancouver/Paris).
- **Demo acceptance:** log in as a coach → publish a 30/60 block in your tz → see it listed; overlap/invalid-duration rejected.

### Slice 3 — Student booking (core + double-booking) → `feat/student-booking`
- **Backend:** Task 8 **(port slice only:** `ports.ts`, `repo.ts`, the `canBook` part of `service.ts`, `index.ts` — **defer the register/suspend/reactivate routes to Slice 6**), Task 10 (session repo portion), Task 12 (book use-case + concurrency/max-3 tests), Task 13 steps 4–5 (list-open-blocks, list-sessions) + the `GET /coaches`, `GET /coaches/:id/open-blocks`, `POST /sessions`, `GET /sessions` routes.
- **Frontend:** Task 17 steps 4–6 (booking `api.ts`, `WeekGrid`, `CoachList`), Task 17 step 7 (`WeekGrid.test.tsx`), wire student panel; Task 18 steps 1–2 (sessions `api.ts`, `UpcomingList`) + student upcoming list.
- **Seed:** register 2 students with **active** enrollment + a week of blocks per coach (Task 15 seed step 2, students portion).
- **Demo acceptance:** log in as student → pick coach → book open slot (slot disappears) → see it in Upcoming. Double-booking + max-3 tests pass.

### Slice 4 — Cancellation → `feat/cancellation`
- **Backend:** Task 13 steps 1–3 (cancel use-case + tests), add `POST /sessions/:id/cancel` route.
- **Frontend:** add the cancel button to `UpcomingList` (Task 18 step 2 `canCancelNow` logic).
- **Demo acceptance:** cancel a session ≥24h out → the slot reopens (reappears in another student's grid); <24h is blocked/disabled.

### Slice 5 — Notifications → `feat/notifications`
- **Backend:** Task 14 (notifications module, subscribers, routes).
- **Frontend:** Task 18 step 3 (notifications `api.ts`, `Inbox`), wire into student (and coach) panels.
- **Demo acceptance:** booking/cancelling produces an in-app message rendered in the recipient's timezone.

### Slice 6 — Enrollment admin → `feat/enrollment-admin`
- **Backend:** the deferred part of Task 8 (`routes.ts`: register via `IdentityApi.createAccount`, suspend, reactivate) + mount the enrollment router.
- **Frontend:** Task 18 step 4 (enrollment-admin `api.ts`, `StudentAdmin`), wire admin panel.
- **Finalize:** complete the end-to-end API smoke test (Task 15 step 4) and the full README (Task 18 step 8).
- **Demo acceptance:** log in as admin → register a student, suspend one → that student can no longer book (403), reactivate restores it.

---

## File Structure

```
package.json                      # root: npm workspaces, orchestration scripts
tsconfig.base.json                # shared strict compiler options
.nvmrc                            # 22
vitest.workspace.ts               # runs tests across workspaces

shared/
  package.json
  src/
    types.ts                      # wire DTOs + Role/Status/Duration enums + error codes
    tz.ts                         # Luxon helpers (pure)
    tz.test.ts

backend/
  package.json
  drizzle.config.ts
  src/
    platform/
      config.ts                   # env + constants (JWT secret, port, db path)
      db.ts                       # drizzle client (better-sqlite3)
      schema.ts                   # all tables + partial unique index
      event-bus.ts                # in-process pub/sub
      event-bus.test.ts
      errors.ts                   # DomainError subclasses + httpStatus/code
      http.ts                     # express app factory, json, error-mapper
      error-mapper.test.ts
      auth.ts                     # JWT mint/verify + requireRole middleware
      auth.test.ts
      clock.ts                    # Clock interface + SystemClock + FixedClock (tests)
    modules/
      identity/
        domain.ts                 # User entity/shape
        ports.ts                  # UserRepo, IdentityApi (createAccount)
        repo.ts                   # Drizzle UserRepo
        service.ts                # login, getUser, createAccount
        routes.ts                 # /users, /auth/login, /me
        index.ts                  # public API (factory)
        service.test.ts
      enrollment/
        domain.ts                 # EnrollmentStatus logic
        ports.ts                  # EnrollmentRepo, EnrollmentPort (canBook)
        repo.ts
        service.ts                # register, suspend, reactivate, canBook
        routes.ts                 # /students endpoints
        index.ts
        service.test.ts           # incl. EnrollmentPort contract test
      booking/
        domain/
          duration.ts             # Duration value object
          rules.ts                # blocksOverlap, canCancel, MAX_UPCOMING
          rules.test.ts
          duration.test.ts
        ports.ts                  # AvailabilityBlockRepo, SessionRepo, EnrollmentPort, EventBus, Clock
        repo.ts                   # Drizzle repos
        events.ts                 # SessionBooked, SessionCancelled event types
        application/
          publish-availability.ts
          book-session.ts
          cancel-session.ts
          list-open-blocks.ts
          list-sessions.ts
        routes.ts
        index.ts
        book-session.test.ts      # incl. concurrency showcase
        cancel-session.test.ts
        publish-availability.test.ts
      notifications/
        domain.ts                 # Notification shape + message builders (tz-aware)
        ports.ts                  # NotificationRepo
        repo.ts
        subscribers.ts            # wire event-bus → write messages
        routes.ts                 # /notifications
        index.ts
        subscribers.test.ts
    seed.ts                       # coaches TO/VAN/PAR, students (1 suspended), blocks, a booking
    main.ts                       # composition root: migrate, seed (dev), wire, mount, listen
    test-support/
      app.ts                      # buildTestApp(): in-memory wired app for supertest
    api.smoke.test.ts             # login→publish→book→cancel→notification

frontend/
  package.json
  index.html
  vite.config.ts
  src/
    main.tsx
    app/
      App.tsx                     # router + providers
      auth-context.tsx            # principal + token
      routes.tsx                  # role-based routes
    shared/
      api.ts                      # fetch client (JWT, typed errors)
      tz.ts                       # re-exports shared/tz (or thin wrappers)
      ui.tsx                      # minimal primitives
    features/
      auth/        LoginPicker.tsx, useMe.ts
      availability/ PublishForm.tsx, MyBlocks.tsx, api.ts
      booking/     CoachList.tsx, WeekGrid.tsx, api.ts
      booking/WeekGrid.test.tsx
      sessions/    UpcomingList.tsx, api.ts
      notifications/ Inbox.tsx, api.ts
      enrollment-admin/ StudentAdmin.tsx, api.ts
README.md
```

---

## Task 1: Monorepo scaffold + strict TS + Vitest

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.nvmrc`, `vitest.workspace.ts`, `.gitignore`
- Create: `shared/package.json`, `shared/tsconfig.json`, `shared/src/smoke.test.ts`

**Interfaces:**
- Produces: a runnable `npm install` / `npm test`; the `shared` workspace package `@ccu/shared`.

- [ ] **Step 1: Create `.nvmrc`**

```
22
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
*.sqlite
*.sqlite-journal
backend/data/
.env
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": false,
    "types": ["node"]
  }
}
```

- [ ] **Step 4: Create root `package.json`**

```json
{
  "name": "challengeu-coaching-session-booking",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "workspaces": ["shared", "backend", "frontend"],
  "scripts": {
    "dev": "npm run dev --workspace backend & npm run dev --workspace frontend",
    "seed": "npm run seed --workspace backend",
    "test": "vitest run",
    "build": "npm run build --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 5: Create `vitest.workspace.ts`**

```ts
export default ["shared", "backend", "frontend"];
```

- [ ] **Step 6: Create `shared/package.json`**

```json
{
  "name": "@ccu/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "exports": { ".": "./src/index.ts", "./tz": "./src/tz.ts", "./types": "./src/types.ts" },
  "dependencies": { "luxon": "^3.5.0" },
  "devDependencies": { "@types/luxon": "^3.4.0" }
}
```

- [ ] **Step 7: Create `shared/tsconfig.json`**

```json
{ "extends": "../tsconfig.base.json", "include": ["src"] }
```

- [ ] **Step 8: Write a smoke test `shared/src/smoke.test.ts`**

```ts
import { expect, test } from "vitest";
test("workspace runs", () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 9: Install and run**

Run: `npm install && npm test`
Expected: install succeeds; the smoke test PASSES.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold npm-workspaces monorepo with strict TS + vitest"
```

---

## Task 2: Shared timezone helpers (Luxon, pure, tested)

**Files:**
- Create: `shared/src/tz.ts`, `shared/src/tz.test.ts`

**Interfaces:**
- Produces:
  - `wallTimeToUtcIso(localDateTime: string, zone: string): string` — `localDateTime` is `'yyyy-MM-ddTHH:mm'` interpreted in `zone`; returns UTC ISO (`...Z`).
  - `addMinutesIso(utcIso: string, minutes: number): string`
  - `formatInZone(utcIso: string, zone: string, fmt?: string): string` — default fmt `'EEE MMM d, h:mm a ZZZZ'`.
  - `weekBoundsUtc(referenceUtcIso: string, zone: string): { fromUtc: string; toUtc: string }` — start/end of the ISO week containing the reference instant, computed in `zone`, returned as UTC ISO.

- [ ] **Step 1: Write failing tests `shared/src/tz.test.ts`**

```ts
import { describe, expect, test } from "vitest";
import { wallTimeToUtcIso, addMinutesIso, formatInZone, weekBoundsUtc } from "./tz.js";

describe("wallTimeToUtcIso", () => {
  test("Toronto 9:00 in winter (EST, -05:00) → 14:00Z", () => {
    expect(wallTimeToUtcIso("2026-01-12T09:00", "America/Toronto")).toBe("2026-01-12T14:00:00.000Z");
  });
  test("Paris 9:00 in winter (CET, +01:00) → 08:00Z", () => {
    expect(wallTimeToUtcIso("2026-01-12T09:00", "Europe/Paris")).toBe("2026-01-12T08:00:00.000Z");
  });
  // DST: Toronto springs forward 2026-03-08; Paris not until 2026-03-29.
  test("DST: same wall time, different offsets across zones on 2026-03-15", () => {
    expect(wallTimeToUtcIso("2026-03-15T09:00", "America/Toronto")).toBe("2026-03-15T13:00:00.000Z"); // EDT -04
    expect(wallTimeToUtcIso("2026-03-15T09:00", "Europe/Paris")).toBe("2026-03-15T08:00:00.000Z");   // CET +01
  });
});

describe("addMinutesIso", () => {
  test("adds 30 minutes", () => {
    expect(addMinutesIso("2026-01-12T14:00:00.000Z", 30)).toBe("2026-01-12T14:30:00.000Z");
  });
});

describe("weekBoundsUtc", () => {
  test("Vancouver week around a Wednesday starts Monday 00:00 local", () => {
    const { fromUtc, toUtc } = weekBoundsUtc("2026-01-14T20:00:00.000Z", "America/Vancouver");
    // Monday 2026-01-12 00:00 PST (-08) = 08:00Z; end is start of next Monday.
    expect(fromUtc).toBe("2026-01-12T08:00:00.000Z");
    expect(toUtc).toBe("2026-01-19T08:00:00.000Z");
  });
});

describe("formatInZone", () => {
  test("renders a UTC instant in the viewer zone", () => {
    expect(formatInZone("2026-01-12T14:00:00.000Z", "America/Toronto")).toContain("9:00");
    expect(formatInZone("2026-01-12T14:00:00.000Z", "Europe/Paris")).toContain("3:00");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run shared/src/tz.test.ts`
Expected: FAIL — module `./tz.js` not found.

- [ ] **Step 3: Implement `shared/src/tz.ts`**

```ts
import { DateTime } from "luxon";

export function wallTimeToUtcIso(localDateTime: string, zone: string): string {
  const dt = DateTime.fromISO(localDateTime, { zone });
  if (!dt.isValid) throw new Error(`Invalid wall time ${localDateTime} / ${zone}`);
  return dt.toUTC().toISO({ suppressMilliseconds: false })!;
}

export function addMinutesIso(utcIso: string, minutes: number): string {
  return DateTime.fromISO(utcIso, { zone: "utc" }).plus({ minutes }).toISO()!;
}

export function formatInZone(utcIso: string, zone: string, fmt = "EEE MMM d, h:mm a ZZZZ"): string {
  return DateTime.fromISO(utcIso, { zone: "utc" }).setZone(zone).toFormat(fmt);
}

export function weekBoundsUtc(referenceUtcIso: string, zone: string): { fromUtc: string; toUtc: string } {
  const ref = DateTime.fromISO(referenceUtcIso, { zone: "utc" }).setZone(zone);
  const start = ref.startOf("week");
  const end = start.plus({ weeks: 1 });
  return { fromUtc: start.toUTC().toISO()!, toUtc: end.toUTC().toISO()! };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run shared/src/tz.test.ts`
Expected: PASS (all cases, including DST). If a formatting assertion is brittle, adjust the expected substring to the actual Luxon output — keep the UTC-conversion assertions exact.

- [ ] **Step 5: Commit**

```bash
git add shared/src/tz.ts shared/src/tz.test.ts
git commit -m "feat(shared): timezone helpers with DST-aware UTC conversion"
```

---

## Task 3: Shared wire types + error codes

**Files:**
- Create: `shared/src/types.ts`, `shared/src/index.ts`

**Interfaces:**
- Produces: `Role`, `SessionStatus`, `Duration`, DTO types, `ErrorCode`, and a barrel `index.ts`.

- [ ] **Step 1: Create `shared/src/types.ts`**

```ts
export type Role = "coach" | "student" | "enrollment_admin";
export type SessionStatus = "confirmed" | "cancelled";
export type DurationMinutes = 30 | 60;

export interface UserDTO { id: string; displayName: string; role: Role; timezone: string; }
export interface AvailabilityBlockDTO {
  id: string; coachUserId: string; startsAtUtc: string; endsAtUtc: string; durationMin: DurationMinutes;
}
export interface SessionDTO {
  id: string; availabilityBlockId: string; studentUserId: string; coachUserId: string;
  startsAtUtc: string; endsAtUtc: string; status: SessionStatus;
}
export interface NotificationDTO {
  id: string; recipientUserId: string; type: "session_booked" | "session_cancelled";
  message: string; createdAt: string; readAt: string | null;
}
export interface EnrollmentDTO { studentUserId: string; status: "active" | "suspended"; }

export type ErrorCode =
  | "SLOT_TAKEN" | "STUDENT_SUSPENDED" | "MAX_UPCOMING_REACHED"
  | "CANCEL_WINDOW_PASSED" | "BLOCK_OVERLAP" | "INVALID_DURATION"
  | "NOT_FOUND" | "FORBIDDEN" | "UNAUTHENTICATED" | "VALIDATION";
export interface ApiError { code: ErrorCode; message: string; }
```

- [ ] **Step 2: Create `shared/src/index.ts`**

```ts
export * from "./types.js";
export * from "./tz.js";
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p shared/tsconfig.json --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add shared/src/types.ts shared/src/index.ts
git commit -m "feat(shared): wire DTOs and error codes"
```

---

## Task 4: Backend platform — DB schema, client, migration, the critical index

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/drizzle.config.ts`
- Create: `backend/src/platform/config.ts`, `backend/src/platform/db.ts`, `backend/src/platform/schema.ts`
- Create: `backend/src/platform/schema.test.ts`

**Interfaces:**
- Produces:
  - `schema` tables: `users`, `enrollments`, `availabilityBlocks`, `sessions`, `notifications`.
  - `createDb(path: string): { db, sqlite }` — a Drizzle instance over better-sqlite3 with migrations applied.
  - `config` object: `{ port, jwtSecret, dbPath }`.

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "@ccu/backend",
  "version": "0.0.0",
  "type": "module",
  "main": "src/main.ts",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "seed": "tsx src/seed.ts",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@ccu/shared": "*",
    "better-sqlite3": "^11.3.0",
    "drizzle-orm": "^0.36.0",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "luxon": "^3.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/supertest": "^6.0.0",
    "drizzle-kit": "^0.28.0",
    "supertest": "^7.0.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{ "extends": "../tsconfig.base.json", "include": ["src"] }
```

- [ ] **Step 3: Create `backend/src/platform/config.ts`**

```ts
export const config = {
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret",
  dbPath: process.env.DB_PATH ?? "backend/data/dev.sqlite",
};
```

- [ ] **Step 4: Create `backend/src/platform/schema.ts`**

```ts
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["coach", "student", "enrollment_admin"] }).notNull(),
  timezone: text("timezone").notNull(),
  createdAt: text("created_at").notNull(),
});

export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  studentUserId: text("student_user_id").notNull().unique().references(() => users.id),
  status: text("status", { enum: ["active", "suspended"] }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const availabilityBlocks = sqliteTable("availability_blocks", {
  id: text("id").primaryKey(),
  coachUserId: text("coach_user_id").notNull().references(() => users.id),
  startsAtUtc: text("starts_at_utc").notNull(),
  endsAtUtc: text("ends_at_utc").notNull(),
  durationMin: integer("duration_min").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    availabilityBlockId: text("availability_block_id").notNull().references(() => availabilityBlocks.id),
    studentUserId: text("student_user_id").notNull().references(() => users.id),
    coachUserId: text("coach_user_id").notNull().references(() => users.id),
    startsAtUtc: text("starts_at_utc").notNull(),
    endsAtUtc: text("ends_at_utc").notNull(),
    status: text("status", { enum: ["confirmed", "cancelled"] }).notNull(),
    createdAt: text("created_at").notNull(),
    cancelledAt: text("cancelled_at"),
  },
  (t) => ({
    oneConfirmedPerBlock: uniqueIndex("one_confirmed_session_per_block")
      .on(t.availabilityBlockId)
      .where(sql`${t.status} = 'confirmed'`),
  }),
);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  recipientUserId: text("recipient_user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["session_booked", "session_cancelled"] }).notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
  readAt: text("read_at"),
});
```

- [ ] **Step 5: Create `backend/drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/platform/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: "backend/data/dev.sqlite" },
});
```

- [ ] **Step 6: Create `backend/src/platform/db.ts`**

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema.js";

export function createDb(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "backend/drizzle" });
  return { db, sqlite };
}
export type Db = ReturnType<typeof createDb>["db"];
```

- [ ] **Step 7: Generate the migration**

Run: `cd backend && npx drizzle-kit generate && cd ..`
Expected: a SQL migration appears under `backend/drizzle/` that includes `CREATE UNIQUE INDEX ... one_confirmed_session_per_block ... WHERE "status" = 'confirmed'`. If the partial `WHERE` is missing, add it manually to the generated SQL.

- [ ] **Step 8: Write test `backend/src/platform/schema.test.ts`**

```ts
import { expect, test } from "vitest";
import { createDb } from "./db.js";
import { sessions, availabilityBlocks, users } from "./schema.js";

test("partial unique index rejects a second confirmed session on the same block", () => {
  const { db } = createDb(":memory:");
  db.insert(users).values({ id: "c1", displayName: "Coach", role: "coach", timezone: "America/Toronto", createdAt: "2026-01-01T00:00:00.000Z" }).run();
  db.insert(users).values({ id: "s1", displayName: "S1", role: "student", timezone: "Europe/Paris", createdAt: "2026-01-01T00:00:00.000Z" }).run();
  db.insert(users).values({ id: "s2", displayName: "S2", role: "student", timezone: "Europe/Paris", createdAt: "2026-01-01T00:00:00.000Z" }).run();
  db.insert(availabilityBlocks).values({ id: "b1", coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", endsAtUtc: "2026-02-01T14:30:00.000Z", durationMin: 30, createdAt: "2026-01-01T00:00:00.000Z" }).run();

  const base = { availabilityBlockId: "b1", coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", endsAtUtc: "2026-02-01T14:30:00.000Z", status: "confirmed" as const, createdAt: "2026-01-01T00:00:00.000Z", cancelledAt: null };
  db.insert(sessions).values({ id: "x1", studentUserId: "s1", ...base }).run();
  expect(() => db.insert(sessions).values({ id: "x2", studentUserId: "s2", ...base }).run()).toThrow();
});
```

- [ ] **Step 9: Run test**

Run: `npx vitest run backend/src/platform/schema.test.ts`
Expected: PASS — the second insert throws on the unique index.

- [ ] **Step 10: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/drizzle.config.ts backend/src/platform/schema.ts backend/src/platform/db.ts backend/src/platform/config.ts backend/src/platform/schema.test.ts backend/drizzle
git commit -m "feat(platform): drizzle schema with partial unique index guaranteeing no double-booking"
```

---

## Task 5: Platform — clock, errors, event bus

**Files:**
- Create: `backend/src/platform/clock.ts`, `backend/src/platform/errors.ts`, `backend/src/platform/event-bus.ts`, `backend/src/platform/event-bus.test.ts`

**Interfaces:**
- Produces:
  - `interface Clock { now(): Date }`, `SystemClock`, `FixedClock(iso)`.
  - `class DomainError extends Error { code: ErrorCode; httpStatus: number }` and subclasses `SlotTaken`, `StudentSuspended`, `MaxUpcomingReached`, `CancelWindowPassed`, `BlockOverlap`, `InvalidDuration`, `NotFound`, `Forbidden`.
  - `interface EventBus { publish<T>(type, payload): void; subscribe<T>(type, handler): void }`, `InMemoryEventBus`.

- [ ] **Step 1: Create `backend/src/platform/clock.ts`**

```ts
export interface Clock { now(): Date; }
export const SystemClock: Clock = { now: () => new Date() };
export class FixedClock implements Clock {
  constructor(private iso: string) {}
  now() { return new Date(this.iso); }
}
```

- [ ] **Step 2: Create `backend/src/platform/errors.ts`**

```ts
import type { ErrorCode } from "@ccu/shared";

export class DomainError extends Error {
  constructor(public code: ErrorCode, public httpStatus: number, message: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SlotTaken extends DomainError { constructor() { super("SLOT_TAKEN", 409, "That time was just booked by someone else."); } }
export class StudentSuspended extends DomainError { constructor() { super("STUDENT_SUSPENDED", 403, "Your access is suspended; you cannot book new sessions."); } }
export class MaxUpcomingReached extends DomainError { constructor() { super("MAX_UPCOMING_REACHED", 422, "You already hold 3 upcoming sessions."); } }
export class CancelWindowPassed extends DomainError { constructor() { super("CANCEL_WINDOW_PASSED", 422, "Sessions can only be cancelled up to 24 hours before they start."); } }
export class BlockOverlap extends DomainError { constructor() { super("BLOCK_OVERLAP", 409, "This availability overlaps an existing block."); } }
export class InvalidDuration extends DomainError { constructor() { super("INVALID_DURATION", 422, "Availability blocks must be 30 or 60 minutes."); } }
export class NotFound extends DomainError { constructor(what = "Resource") { super("NOT_FOUND", 404, `${what} not found.`); } }
export class Forbidden extends DomainError { constructor() { super("FORBIDDEN", 403, "You are not allowed to do that."); } }
```

- [ ] **Step 3: Write failing test `backend/src/platform/event-bus.test.ts`**

```ts
import { expect, test, vi } from "vitest";
import { InMemoryEventBus } from "./event-bus.js";

test("subscribers receive published payloads by type", () => {
  const bus = new InMemoryEventBus();
  const handler = vi.fn();
  bus.subscribe("SessionBooked", handler);
  bus.publish("SessionBooked", { sessionId: "s1" });
  bus.publish("SessionCancelled", { sessionId: "s2" });
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler).toHaveBeenCalledWith({ sessionId: "s1" });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run backend/src/platform/event-bus.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `backend/src/platform/event-bus.ts`**

```ts
type Handler<T = unknown> = (payload: T) => void;

export interface EventBus {
  publish<T>(type: string, payload: T): void;
  subscribe<T>(type: string, handler: Handler<T>): void;
}

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Handler[]>();
  publish<T>(type: string, payload: T): void {
    for (const h of this.handlers.get(type) ?? []) h(payload);
  }
  subscribe<T>(type: string, handler: Handler<T>): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler as Handler);
    this.handlers.set(type, list);
  }
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run backend/src/platform/event-bus.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/platform/clock.ts backend/src/platform/errors.ts backend/src/platform/event-bus.ts backend/src/platform/event-bus.test.ts
git commit -m "feat(platform): clock, typed domain errors, in-memory event bus"
```

---

## Task 6: Platform — HTTP app factory, error mapper, JWT auth middleware

**Files:**
- Create: `backend/src/platform/http.ts`, `backend/src/platform/auth.ts`
- Create: `backend/src/platform/error-mapper.test.ts`, `backend/src/platform/auth.test.ts`

**Interfaces:**
- Produces:
  - `createApp(): express.Express` with JSON parsing; `mountErrorMapper(app)` installed last.
  - `errorMapper(err, req, res, next)` — turns `DomainError`/`ZodError` into `{ code, message }` + status; unknown → 500.
  - `signToken(principal): string`, `verifyToken(token): Principal`.
  - `requireAuth(req,res,next)` populates `req.principal`; `requireRole(...roles)` guards.
  - `interface Principal { userId: string; role: Role }`; Express `Request` augmented with `principal?: Principal`.

- [ ] **Step 1: Create `backend/src/platform/auth.ts`**

```ts
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { Role } from "@ccu/shared";
import { config } from "./config.js";
import { DomainError } from "./errors.js";

export interface Principal { userId: string; role: Role; }
declare global { namespace Express { interface Request { principal?: Principal; } } }

export function signToken(p: Principal): string {
  return jwt.sign(p, config.jwtSecret, { expiresIn: "8h" });
}
export function verifyToken(token: string): Principal {
  return jwt.verify(token, config.jwtSecret) as Principal;
}
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) return next(new DomainError("UNAUTHENTICATED", 401, "Missing token."));
  try { req.principal = verifyToken(header.slice(7)); next(); }
  catch { next(new DomainError("UNAUTHENTICATED", 401, "Invalid token.")); }
}
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.principal) return next(new DomainError("UNAUTHENTICATED", 401, "Not authenticated."));
    if (!roles.includes(req.principal.role)) return next(new DomainError("FORBIDDEN", 403, "Wrong role."));
    next();
  };
}
```

- [ ] **Step 2: Create `backend/src/platform/http.ts`**

```ts
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { DomainError } from "./errors.js";

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  return app;
}

export function mountErrorMapper(app: Express): void {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof DomainError) return res.status(err.httpStatus).json({ code: err.code, message: err.message });
    if (err instanceof ZodError) return res.status(400).json({ code: "VALIDATION", message: err.issues.map((i) => i.message).join("; ") });
    console.error(err);
    res.status(500).json({ code: "VALIDATION", message: "Unexpected error." });
  });
}
```

- [ ] **Step 3: Write failing tests `backend/src/platform/error-mapper.test.ts`**

```ts
import { expect, test } from "vitest";
import request from "supertest";
import { createApp, mountErrorMapper } from "./http.js";
import { SlotTaken } from "./errors.js";

test("maps a DomainError to its status + code", async () => {
  const app = createApp();
  app.get("/boom", (_req, _res, next) => next(new SlotTaken()));
  mountErrorMapper(app);
  const res = await request(app).get("/boom");
  expect(res.status).toBe(409);
  expect(res.body).toEqual({ code: "SLOT_TAKEN", message: expect.any(String) });
});
```

- [ ] **Step 4: Write failing tests `backend/src/platform/auth.test.ts`**

```ts
import { expect, test } from "vitest";
import request from "supertest";
import { createApp, mountErrorMapper } from "./http.js";
import { signToken, requireAuth, requireRole } from "./auth.js";

test("requireRole allows the right role and blocks others", async () => {
  const app = createApp();
  app.get("/coach-only", requireAuth, requireRole("coach"), (req, res) => res.json({ ok: req.principal!.userId }));
  mountErrorMapper(app);
  const coach = signToken({ userId: "c1", role: "coach" });
  const student = signToken({ userId: "s1", role: "student" });
  expect((await request(app).get("/coach-only").set("authorization", `Bearer ${coach}`)).status).toBe(200);
  expect((await request(app).get("/coach-only").set("authorization", `Bearer ${student}`)).status).toBe(403);
  expect((await request(app).get("/coach-only")).status).toBe(401);
});
```

- [ ] **Step 5: Run to verify failure, then it will pass once deps installed**

Run: `npm install` (installs backend deps added in Task 4), then `npx vitest run backend/src/platform/error-mapper.test.ts backend/src/platform/auth.test.ts`
Expected: PASS for both.

- [ ] **Step 6: Commit**

```bash
git add backend/src/platform/http.ts backend/src/platform/auth.ts backend/src/platform/error-mapper.test.ts backend/src/platform/auth.test.ts
git commit -m "feat(platform): express app factory, error mapper, JWT auth + role guards"
```

---

## Task 7: Identity module — accounts, login, ports

**Files:**
- Create: `backend/src/modules/identity/{domain.ts,ports.ts,repo.ts,service.ts,routes.ts,index.ts}`
- Create: `backend/src/modules/identity/service.test.ts`

**Interfaces:**
- Consumes: `Db` (Task 4), `signToken` (Task 6), `NotFound` (Task 5), `UserDTO`/`Role` (Task 3).
- Produces:
  - `interface UserRepo { insert(u: UserRow): void; byId(id): UserRow | undefined; all(): UserRow[] }`
  - `interface IdentityApi { createAccount(input: { displayName; role: Role; timezone }): UserDTO }` — used by Enrollment.
  - `createIdentityModule(db): { api: IdentityApi; router: Router; repo: UserRepo }`
  - routes: `GET /users`, `POST /auth/login {userId}`, `GET /me`.

- [ ] **Step 1: Create `backend/src/modules/identity/ports.ts`**

```ts
import type { Role, UserDTO } from "@ccu/shared";
export interface UserRow { id: string; displayName: string; role: Role; timezone: string; createdAt: string; }
export interface UserRepo {
  insert(u: UserRow): void;
  byId(id: string): UserRow | undefined;
  all(): UserRow[];
}
export interface IdentityApi {
  createAccount(input: { displayName: string; role: Role; timezone: string }): UserDTO;
  getUser(id: string): UserDTO;
}
export const toDTO = (u: UserRow): UserDTO => ({ id: u.id, displayName: u.displayName, role: u.role, timezone: u.timezone });
```

- [ ] **Step 2: Create `backend/src/modules/identity/repo.ts`**

```ts
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
```

- [ ] **Step 3: Create `backend/src/modules/identity/service.ts`**

```ts
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
```

- [ ] **Step 4: Create `backend/src/modules/identity/routes.ts`**

```ts
import { Router } from "express";
import { z } from "zod";
import { signToken, requireAuth } from "../../platform/auth.js";
import { NotFound } from "../../platform/errors.js";
import type { UserRepo } from "./ports.js";
import { toDTO } from "./ports.js";

export function identityRoutes(repo: UserRepo): Router {
  const r = Router();
  r.get("/users", (_req, res) => res.json(repo.all().map(toDTO)));
  r.post("/auth/login", (req, res) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    const user = repo.byId(userId);
    if (!user) throw new NotFound("User");
    res.json({ token: signToken({ userId: user.id, role: user.role }), user: toDTO(user) });
  });
  r.get("/me", requireAuth, (req, res) => {
    const user = repo.byId(req.principal!.userId);
    if (!user) throw new NotFound("User");
    res.json(toDTO(user));
  });
  return r;
}
```

- [ ] **Step 5: Create `backend/src/modules/identity/index.ts`**

```ts
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
```

- [ ] **Step 6: Write test `backend/src/modules/identity/service.test.ts`**

```ts
import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { createIdentityModule } from "./index.js";

test("createAccount persists and getUser returns it", () => {
  const { db } = createDb(":memory:");
  const { api } = createIdentityModule(db, new FixedClock("2026-01-01T00:00:00.000Z"));
  const u = api.createAccount({ displayName: "Ada", role: "student", timezone: "Europe/Paris" });
  expect(u.id).toBeTruthy();
  expect(api.getUser(u.id)).toMatchObject({ displayName: "Ada", role: "student", timezone: "Europe/Paris" });
});
```

- [ ] **Step 7: Run test**

Run: `npx vitest run backend/src/modules/identity/service.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/identity
git commit -m "feat(identity): accounts, login (JWT), IdentityApi.createAccount"
```

---

## Task 8: Enrollment module — status, registration, EnrollmentPort (contract test)

**Files:**
- Create: `backend/src/modules/enrollment/{domain.ts,ports.ts,repo.ts,service.ts,routes.ts,index.ts}`
- Create: `backend/src/modules/enrollment/service.test.ts`

**Interfaces:**
- Consumes: `IdentityApi` (Task 7), `Db`, `Clock`, `NotFound`/`Forbidden`.
- Produces:
  - `interface EnrollmentPort { canBook(studentUserId: string): Promise<boolean> }` — **this is the interface Booking will depend on** (Task 11+).
  - `createEnrollmentModule(db, identityApi, clock): { port: EnrollmentPort; router: Router }`
  - routes: `POST /students {displayName,timezone}`, `GET /students`, `POST /students/:id/suspend`, `POST /students/:id/reactivate` (all `requireRole("enrollment_admin")`).

- [ ] **Step 1: Create `backend/src/modules/enrollment/ports.ts`**

```ts
export interface EnrollmentRow { id: string; studentUserId: string; status: "active" | "suspended"; createdAt: string; updatedAt: string; }
export interface EnrollmentRepo {
  insert(e: EnrollmentRow): void;
  byStudent(studentUserId: string): EnrollmentRow | undefined;
  setStatus(studentUserId: string, status: "active" | "suspended", at: string): void;
  all(): EnrollmentRow[];
}
export interface EnrollmentPort { canBook(studentUserId: string): Promise<boolean>; }
```

- [ ] **Step 2: Create `backend/src/modules/enrollment/repo.ts`**

```ts
import { eq } from "drizzle-orm";
import type { Db } from "../../platform/db.js";
import { enrollments } from "../../platform/schema.js";
import type { EnrollmentRepo, EnrollmentRow } from "./ports.js";

export function drizzleEnrollmentRepo(db: Db): EnrollmentRepo {
  return {
    insert: (e) => { db.insert(enrollments).values(e).run(); },
    byStudent: (sid) => db.select().from(enrollments).where(eq(enrollments.studentUserId, sid)).get() as EnrollmentRow | undefined,
    setStatus: (sid, status, at) => { db.update(enrollments).set({ status, updatedAt: at }).where(eq(enrollments.studentUserId, sid)).run(); },
    all: () => db.select().from(enrollments).all() as EnrollmentRow[],
  };
}
```

- [ ] **Step 3: Create `backend/src/modules/enrollment/service.ts`**

```ts
import { randomUUID } from "node:crypto";
import type { Clock } from "../../platform/clock.js";
import { NotFound } from "../../platform/errors.js";
import type { IdentityApi } from "../identity/ports.js";
import type { EnrollmentPort, EnrollmentRepo } from "./ports.js";

export function enrollmentService(repo: EnrollmentRepo, identity: IdentityApi, clock: Clock) {
  const register = (displayName: string, timezone: string) => {
    const user = identity.createAccount({ displayName, role: "student", timezone });
    const now = clock.now().toISOString();
    repo.insert({ id: randomUUID(), studentUserId: user.id, status: "active", createdAt: now, updatedAt: now });
    return { studentUserId: user.id, displayName: user.displayName, timezone: user.timezone, status: "active" as const };
  };
  const setStatus = (studentUserId: string, status: "active" | "suspended") => {
    if (!repo.byStudent(studentUserId)) throw new NotFound("Enrollment");
    repo.setStatus(studentUserId, status, clock.now().toISOString());
  };
  const port: EnrollmentPort = {
    async canBook(studentUserId) { return repo.byStudent(studentUserId)?.status === "active"; },
  };
  const list = () => repo.all();
  return { register, setStatus, port, list };
}
```

- [ ] **Step 4: Create `backend/src/modules/enrollment/routes.ts`**

```ts
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../platform/auth.js";
import type { enrollmentService } from "./service.js";

export function enrollmentRoutes(svc: ReturnType<typeof enrollmentService>): Router {
  const r = Router();
  r.use(requireAuth, requireRole("enrollment_admin"));
  r.post("/students", (req, res) => {
    const { displayName, timezone } = z.object({ displayName: z.string().min(1), timezone: z.string().min(1) }).parse(req.body);
    res.status(201).json(svc.register(displayName, timezone));
  });
  r.get("/students", (_req, res) => res.json(svc.list()));
  r.post("/students/:id/suspend", (req, res) => { svc.setStatus(req.params.id, "suspended"); res.json({ studentUserId: req.params.id, status: "suspended" }); });
  r.post("/students/:id/reactivate", (req, res) => { svc.setStatus(req.params.id, "active"); res.json({ studentUserId: req.params.id, status: "active" }); });
  return r;
}
```

- [ ] **Step 5: Create `backend/src/modules/enrollment/index.ts`**

```ts
import type { Db } from "../../platform/db.js";
import type { Clock } from "../../platform/clock.js";
import type { IdentityApi } from "../identity/ports.js";
import { drizzleEnrollmentRepo } from "./repo.js";
import { enrollmentService } from "./service.js";
import { enrollmentRoutes } from "./routes.js";

export function createEnrollmentModule(db: Db, identity: IdentityApi, clock: Clock) {
  const svc = enrollmentService(drizzleEnrollmentRepo(db), identity, clock);
  return { port: svc.port, router: enrollmentRoutes(svc), service: svc };
}
```

- [ ] **Step 6: Write tests `backend/src/modules/enrollment/service.test.ts`**

```ts
import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { createIdentityModule } from "../identity/index.js";
import { createEnrollmentModule } from "./index.js";

function setup() {
  const { db } = createDb(":memory:");
  const clock = new FixedClock("2026-01-01T00:00:00.000Z");
  const identity = createIdentityModule(db, clock).api;
  return createEnrollmentModule(db, identity, clock);
}

test("register creates an active student; canBook is true", async () => {
  const m = setup();
  const s = m.service.register("Zoe", "America/Vancouver");
  expect(await m.port.canBook(s.studentUserId)).toBe(true);
});

test("suspend flips canBook to false; reactivate restores it (EnrollmentPort contract)", async () => {
  const m = setup();
  const s = m.service.register("Zoe", "America/Vancouver");
  m.service.setStatus(s.studentUserId, "suspended");
  expect(await m.port.canBook(s.studentUserId)).toBe(false);
  m.service.setStatus(s.studentUserId, "active");
  expect(await m.port.canBook(s.studentUserId)).toBe(true);
});

test("canBook is false for an unknown student", async () => {
  const m = setup();
  expect(await m.port.canBook("nobody")).toBe(false);
});
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run backend/src/modules/enrollment/service.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/enrollment
git commit -m "feat(enrollment): registration, suspend/reactivate, EnrollmentPort.canBook"
```

---

## Task 9: Booking domain — Duration value object + pure rules

**Files:**
- Create: `backend/src/modules/booking/domain/{duration.ts,rules.ts}`
- Create: `backend/src/modules/booking/domain/{duration.test.ts,rules.test.ts}`

**Interfaces:**
- Consumes: `InvalidDuration` (Task 5).
- Produces:
  - `Duration.of(min: number): 30 | 60` (throws `InvalidDuration`).
  - `blocksOverlap(a: { startsAtUtc; endsAtUtc }, b: { startsAtUtc; endsAtUtc }): boolean`
  - `canCancel(startsAtUtc: string, now: Date, windowHours?: number): boolean`
  - `MAX_UPCOMING = 3`

- [ ] **Step 1: Write failing tests `backend/src/modules/booking/domain/duration.test.ts`**

```ts
import { expect, test } from "vitest";
import { Duration } from "./duration.js";

test("accepts 30 and 60", () => { expect(Duration.of(30)).toBe(30); expect(Duration.of(60)).toBe(60); });
test("rejects anything else", () => { expect(() => Duration.of(45)).toThrow(); expect(() => Duration.of(0)).toThrow(); });
```

- [ ] **Step 2: Write failing tests `backend/src/modules/booking/domain/rules.test.ts`**

```ts
import { expect, test } from "vitest";
import { blocksOverlap, canCancel, MAX_UPCOMING } from "./rules.js";

const blk = (s: string, e: string) => ({ startsAtUtc: s, endsAtUtc: e });

test("overlap: identical and containing ranges overlap", () => {
  expect(blocksOverlap(blk("2026-02-01T14:00:00Z", "2026-02-01T14:30:00Z"), blk("2026-02-01T14:00:00Z", "2026-02-01T14:30:00Z"))).toBe(true);
  expect(blocksOverlap(blk("2026-02-01T14:00:00Z", "2026-02-01T15:00:00Z"), blk("2026-02-01T14:15:00Z", "2026-02-01T14:45:00Z"))).toBe(true);
});
test("overlap: adjacent (touching) ranges do NOT overlap", () => {
  expect(blocksOverlap(blk("2026-02-01T14:00:00Z", "2026-02-01T14:30:00Z"), blk("2026-02-01T14:30:00Z", "2026-02-01T15:00:00Z"))).toBe(false);
});
test("canCancel: boundary at 24h", () => {
  const start = "2026-02-02T14:00:00.000Z";
  expect(canCancel(start, new Date("2026-02-01T13:59:00.000Z"))).toBe(true);   // >24h before
  expect(canCancel(start, new Date("2026-02-01T14:00:00.000Z"))).toBe(true);   // exactly 24h
  expect(canCancel(start, new Date("2026-02-01T14:01:00.000Z"))).toBe(false);  // <24h
});
test("MAX_UPCOMING is 3", () => { expect(MAX_UPCOMING).toBe(3); });
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run backend/src/modules/booking/domain`
Expected: FAIL — modules not found.

- [ ] **Step 4: Implement `backend/src/modules/booking/domain/duration.ts`**

```ts
import { InvalidDuration } from "../../../platform/errors.js";
export const Duration = {
  of(min: number): 30 | 60 {
    if (min === 30 || min === 60) return min;
    throw new InvalidDuration();
  },
};
```

- [ ] **Step 5: Implement `backend/src/modules/booking/domain/rules.ts`**

```ts
export const MAX_UPCOMING = 3;

export function blocksOverlap(a: { startsAtUtc: string; endsAtUtc: string }, b: { startsAtUtc: string; endsAtUtc: string }): boolean {
  return a.startsAtUtc < b.endsAtUtc && b.startsAtUtc < a.endsAtUtc;
}

export function canCancel(startsAtUtc: string, now: Date, windowHours = 24): boolean {
  const msBefore = new Date(startsAtUtc).getTime() - now.getTime();
  return msBefore >= windowHours * 3600_000;
}
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run backend/src/modules/booking/domain`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/booking/domain
git commit -m "feat(booking): duration value object + pure overlap/cancel rules"
```

---

## Task 10: Booking repositories + ports + event types

**Files:**
- Create: `backend/src/modules/booking/{ports.ts,repo.ts,events.ts}`

**Interfaces:**
- Consumes: `Db`, `EnrollmentPort` (Task 8), `EventBus`/`Clock` (Task 5).
- Produces:
  - `interface AvailabilityBlockRepo { insert(b); byCoachInRange(coachId, fromUtc, toUtc); byId(id); openInRange(coachId, fromUtc, toUtc) }`
  - `interface SessionRepo { insertConfirmed(s); countUpcomingForStudent(studentId, nowIso); byId(id); cancel(id, at); listForUserUpcoming(userId, nowIso) }`
  - `SessionRow`, `BlockRow` types.
  - `events.ts`: `SESSION_BOOKED = "SessionBooked"`, `SESSION_CANCELLED = "SessionCancelled"`, payload types `SessionEvent { sessionId; studentUserId; coachUserId; startsAtUtc }`.

- [ ] **Step 1: Create `backend/src/modules/booking/events.ts`**

```ts
export const SESSION_BOOKED = "SessionBooked";
export const SESSION_CANCELLED = "SessionCancelled";
export interface SessionEvent { sessionId: string; studentUserId: string; coachUserId: string; startsAtUtc: string; }
```

- [ ] **Step 2: Create `backend/src/modules/booking/ports.ts`**

```ts
import type { DurationMinutes } from "@ccu/shared";
export interface BlockRow { id: string; coachUserId: string; startsAtUtc: string; endsAtUtc: string; durationMin: DurationMinutes; createdAt: string; }
export interface SessionRow { id: string; availabilityBlockId: string; studentUserId: string; coachUserId: string; startsAtUtc: string; endsAtUtc: string; status: "confirmed" | "cancelled"; createdAt: string; cancelledAt: string | null; }

export interface AvailabilityBlockRepo {
  insert(b: BlockRow): void;
  byId(id: string): BlockRow | undefined;
  byCoachInRange(coachId: string, fromUtc: string, toUtc: string): BlockRow[];
  openInRange(coachId: string, fromUtc: string, toUtc: string): BlockRow[]; // no confirmed session
}
export interface SessionRepo {
  insertConfirmed(s: SessionRow): void; // throws on unique-index violation
  countUpcomingForStudent(studentId: string, nowIso: string): number;
  byId(id: string): SessionRow | undefined;
  cancel(id: string, at: string): void;
  listForUserUpcoming(userId: string, nowIso: string): SessionRow[];
}
export type { EnrollmentPort } from "../enrollment/ports.js";
```

- [ ] **Step 3: Create `backend/src/modules/booking/repo.ts`**

```ts
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { Db } from "../../platform/db.js";
import { availabilityBlocks, sessions } from "../../platform/schema.js";
import { SlotTaken } from "../../platform/errors.js";
import type { AvailabilityBlockRepo, BlockRow, SessionRepo, SessionRow } from "./ports.js";

export function drizzleBlockRepo(db: Db): AvailabilityBlockRepo {
  return {
    insert: (b) => { db.insert(availabilityBlocks).values(b).run(); },
    byId: (id) => db.select().from(availabilityBlocks).where(eq(availabilityBlocks.id, id)).get() as BlockRow | undefined,
    byCoachInRange: (coachId, from, to) =>
      db.select().from(availabilityBlocks)
        .where(and(eq(availabilityBlocks.coachUserId, coachId), gte(availabilityBlocks.startsAtUtc, from), lt(availabilityBlocks.startsAtUtc, to)))
        .all() as BlockRow[],
    openInRange: (coachId, from, to) =>
      db.all(sql`
        SELECT b.* FROM availability_blocks b
        WHERE b.coach_user_id = ${coachId} AND b.starts_at_utc >= ${from} AND b.starts_at_utc < ${to}
          AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.availability_block_id = b.id AND s.status = 'confirmed')
        ORDER BY b.starts_at_utc
      `) as unknown as BlockRow[],
  };
}

export function drizzleSessionRepo(db: Db): SessionRepo {
  return {
    insertConfirmed: (s) => {
      try { db.insert(sessions).values(s).run(); }
      catch (e) {
        if (e instanceof Error && /UNIQUE/i.test(e.message)) throw new SlotTaken();
        throw e;
      }
    },
    countUpcomingForStudent: (studentId, nowIso) =>
      (db.select({ c: sql<number>`count(*)` }).from(sessions)
        .where(and(eq(sessions.studentUserId, studentId), eq(sessions.status, "confirmed"), gte(sessions.startsAtUtc, nowIso)))
        .get()?.c) ?? 0,
    byId: (id) => db.select().from(sessions).where(eq(sessions.id, id)).get() as SessionRow | undefined,
    cancel: (id, at) => { db.update(sessions).set({ status: "cancelled", cancelledAt: at }).where(eq(sessions.id, id)).run(); },
    listForUserUpcoming: (userId, nowIso) =>
      db.all(sql`
        SELECT * FROM sessions
        WHERE (student_user_id = ${userId} OR coach_user_id = ${userId})
          AND status = 'confirmed' AND starts_at_utc >= ${nowIso}
        ORDER BY starts_at_utc
      `) as unknown as SessionRow[],
  };
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -p backend/tsconfig.json --noEmit`
Expected: no errors. (No standalone test here — repos are exercised by Tasks 11–14.)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/booking/ports.ts backend/src/modules/booking/repo.ts backend/src/modules/booking/events.ts
git commit -m "feat(booking): repositories, ports, and session event types"
```

---

## Task 11: Publish availability use-case (overlap enforced) + route

**Files:**
- Create: `backend/src/modules/booking/application/publish-availability.ts`
- Create: `backend/src/modules/booking/publish-availability.test.ts`

**Interfaces:**
- Consumes: `AvailabilityBlockRepo`, `Duration`, `blocksOverlap`, `addMinutesIso` (shared tz), `BlockOverlap`, `Clock`.
- Produces: `publishAvailability(deps)({ coachUserId, startsAtUtc, durationMin }): AvailabilityBlockDTO`.

- [ ] **Step 1: Write failing test `backend/src/modules/booking/publish-availability.test.ts`**

```ts
import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { drizzleBlockRepo } from "./repo.js";
import { makePublishAvailability } from "./application/publish-availability.js";
import { users } from "../../platform/schema.js";

function setup() {
  const { db } = createDb(":memory:");
  db.insert(users).values({ id: "c1", displayName: "C", role: "coach", timezone: "America/Toronto", createdAt: "2026-01-01T00:00:00.000Z" }).run();
  const publish = makePublishAvailability({ blocks: drizzleBlockRepo(db), clock: new FixedClock("2026-01-01T00:00:00.000Z") });
  return { publish };
}

test("publishes a 30-min block", () => {
  const { publish } = setup();
  const b = publish({ coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", durationMin: 30 });
  expect(b.endsAtUtc).toBe("2026-02-01T14:30:00.000Z");
});
test("rejects an overlapping block", () => {
  const { publish } = setup();
  publish({ coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", durationMin: 60 });
  expect(() => publish({ coachUserId: "c1", startsAtUtc: "2026-02-01T14:30:00.000Z", durationMin: 30 })).toThrow();
});
test("rejects an invalid duration", () => {
  const { publish } = setup();
  expect(() => publish({ coachUserId: "c1", startsAtUtc: "2026-02-01T14:00:00.000Z", durationMin: 45 as 30 })).toThrow();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run backend/src/modules/booking/publish-availability.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `backend/src/modules/booking/application/publish-availability.ts`**

```ts
import { randomUUID } from "node:crypto";
import { addMinutesIso } from "@ccu/shared";
import type { AvailabilityBlockDTO } from "@ccu/shared";
import type { Clock } from "../../../platform/clock.js";
import { BlockOverlap } from "../../../platform/errors.js";
import { Duration } from "../domain/duration.js";
import { blocksOverlap } from "../domain/rules.js";
import type { AvailabilityBlockRepo } from "../ports.js";

export function makePublishAvailability(deps: { blocks: AvailabilityBlockRepo; clock: Clock }) {
  return function publish(input: { coachUserId: string; startsAtUtc: string; durationMin: 30 | 60 }): AvailabilityBlockDTO {
    const durationMin = Duration.of(input.durationMin);
    const startsAtUtc = new Date(input.startsAtUtc).toISOString();
    const endsAtUtc = addMinutesIso(startsAtUtc, durationMin);
    // Same-day window is enough to find overlaps cheaply; widen to the block's own day bounds.
    const dayFrom = startsAtUtc.slice(0, 10) + "T00:00:00.000Z";
    const dayTo = addMinutesIso(dayFrom, 24 * 60);
    const existing = deps.blocks.byCoachInRange(input.coachUserId, dayFrom, dayTo);
    if (existing.some((b) => blocksOverlap(b, { startsAtUtc, endsAtUtc }))) throw new BlockOverlap();
    const row = { id: randomUUID(), coachUserId: input.coachUserId, startsAtUtc, endsAtUtc, durationMin, createdAt: deps.clock.now().toISOString() };
    deps.blocks.insert(row);
    return { id: row.id, coachUserId: row.coachUserId, startsAtUtc, endsAtUtc, durationMin };
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run backend/src/modules/booking/publish-availability.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/booking/application/publish-availability.ts backend/src/modules/booking/publish-availability.test.ts
git commit -m "feat(booking): publish availability with overlap enforcement"
```

---

## Task 12: Book session use-case + the concurrency showcase test

**Files:**
- Create: `backend/src/modules/booking/application/book-session.ts`
- Create: `backend/src/modules/booking/book-session.test.ts`

**Interfaces:**
- Consumes: `AvailabilityBlockRepo`, `SessionRepo`, `EnrollmentPort`, `EventBus`, `Clock`, `MAX_UPCOMING`, errors (`SlotTaken`, `StudentSuspended`, `MaxUpcomingReached`, `NotFound`), `SESSION_BOOKED`.
- Produces: `makeBookSession(deps)({ studentUserId, availabilityBlockId }): SessionDTO`.

- [ ] **Step 1: Write failing tests `backend/src/modules/booking/book-session.test.ts`**

```ts
import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { InMemoryEventBus } from "../../platform/event-bus.js";
import { users, availabilityBlocks } from "../../platform/schema.js";
import { drizzleBlockRepo, drizzleSessionRepo } from "./repo.js";
import { makeBookSession } from "./application/book-session.js";
import { SESSION_BOOKED } from "./events.js";

function setup(opts?: { canBook?: boolean }) {
  const { db } = createDb(":memory:");
  const now = "2026-01-10T00:00:00.000Z";
  db.insert(users).values({ id: "c1", displayName: "C", role: "coach", timezone: "America/Toronto", createdAt: now }).run();
  for (const s of ["s1", "s2"]) db.insert(users).values({ id: s, displayName: s, role: "student", timezone: "Europe/Paris", createdAt: now }).run();
  const mkBlock = (id: string, start: string) =>
    db.insert(availabilityBlocks).values({ id, coachUserId: "c1", startsAtUtc: start, endsAtUtc: start.replace("00:00.000Z", "30:00.000Z"), durationMin: 30, createdAt: now }).run();
  mkBlock("b1", "2026-02-01T14:00:00.000Z");
  const bus = new InMemoryEventBus();
  const book = makeBookSession({
    blocks: drizzleBlockRepo(db), sessions: drizzleSessionRepo(db),
    enrollment: { canBook: async () => opts?.canBook ?? true },
    bus, clock: new FixedClock(now),
  });
  return { db, bus, book, mkBlock, now };
}

test("books an open slot and emits SessionBooked", async () => {
  const { bus, book } = setup();
  const events: unknown[] = [];
  bus.subscribe(SESSION_BOOKED, (e) => events.push(e));
  const s = await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  expect(s.status).toBe("confirmed");
  expect(events).toHaveLength(1);
});

test("suspended student cannot book", async () => {
  const { book } = setup({ canBook: false });
  await expect(book({ studentUserId: "s1", availabilityBlockId: "b1" })).rejects.toThrow();
});

test("two bookings on the same block → exactly one confirmed (double-booking impossible)", async () => {
  const { book } = setup();
  const results = await Promise.allSettled([
    book({ studentUserId: "s1", availabilityBlockId: "b1" }),
    book({ studentUserId: "s2", availabilityBlockId: "b1" }),
  ]);
  const ok = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");
  expect(ok).toHaveLength(1);
  expect(failed).toHaveLength(1);
});

test("4th upcoming booking is rejected (max 3)", async () => {
  const { db, book, mkBlock } = setup();
  mkBlock("b2", "2026-02-02T14:00:00.000Z");
  mkBlock("b3", "2026-02-03T14:00:00.000Z");
  mkBlock("b4", "2026-02-04T14:00:00.000Z");
  await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  await book({ studentUserId: "s1", availabilityBlockId: "b2" });
  await book({ studentUserId: "s1", availabilityBlockId: "b3" });
  await expect(book({ studentUserId: "s1", availabilityBlockId: "b4" })).rejects.toThrow();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run backend/src/modules/booking/book-session.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `backend/src/modules/booking/application/book-session.ts`**

```ts
import { randomUUID } from "node:crypto";
import type { SessionDTO } from "@ccu/shared";
import type { Clock } from "../../../platform/clock.js";
import type { EventBus } from "../../../platform/event-bus.js";
import { MaxUpcomingReached, NotFound, StudentSuspended } from "../../../platform/errors.js";
import { MAX_UPCOMING } from "../domain/rules.js";
import { SESSION_BOOKED, type SessionEvent } from "../events.js";
import type { AvailabilityBlockRepo, EnrollmentPort, SessionRepo } from "../ports.js";

export function makeBookSession(deps: {
  blocks: AvailabilityBlockRepo; sessions: SessionRepo; enrollment: EnrollmentPort; bus: EventBus; clock: Clock;
}) {
  return async function book(input: { studentUserId: string; availabilityBlockId: string }): Promise<SessionDTO> {
    const block = deps.blocks.byId(input.availabilityBlockId);
    if (!block) throw new NotFound("Availability block");
    if (!(await deps.enrollment.canBook(input.studentUserId))) throw new StudentSuspended();
    const nowIso = deps.clock.now().toISOString();
    if (deps.sessions.countUpcomingForStudent(input.studentUserId, nowIso) >= MAX_UPCOMING) throw new MaxUpcomingReached();

    const row = {
      id: randomUUID(), availabilityBlockId: block.id, studentUserId: input.studentUserId, coachUserId: block.coachUserId,
      startsAtUtc: block.startsAtUtc, endsAtUtc: block.endsAtUtc, status: "confirmed" as const, createdAt: nowIso, cancelledAt: null,
    };
    deps.sessions.insertConfirmed(row); // throws SlotTaken on the unique index — the hard guarantee

    const evt: SessionEvent = { sessionId: row.id, studentUserId: row.studentUserId, coachUserId: row.coachUserId, startsAtUtc: row.startsAtUtc };
    deps.bus.publish(SESSION_BOOKED, evt);
    return { id: row.id, availabilityBlockId: row.availabilityBlockId, studentUserId: row.studentUserId, coachUserId: row.coachUserId, startsAtUtc: row.startsAtUtc, endsAtUtc: row.endsAtUtc, status: "confirmed" };
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run backend/src/modules/booking/book-session.test.ts`
Expected: PASS — all four tests, including the concurrency showcase.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/booking/application/book-session.ts backend/src/modules/booking/book-session.test.ts
git commit -m "feat(booking): book session enforcing suspension, max-3, and DB-guaranteed no double-booking"
```

---

## Task 13: Cancel session use-case (24h rule, reopens slot) + route wiring

**Files:**
- Create: `backend/src/modules/booking/application/cancel-session.ts`
- Create: `backend/src/modules/booking/application/list-open-blocks.ts`
- Create: `backend/src/modules/booking/application/list-sessions.ts`
- Create: `backend/src/modules/booking/cancel-session.test.ts`
- Create: `backend/src/modules/booking/routes.ts`, `backend/src/modules/booking/index.ts`

**Interfaces:**
- Consumes: `SessionRepo`, `AvailabilityBlockRepo`, `canCancel`, `CancelWindowPassed`, `NotFound`, `Forbidden`, `EventBus`, `Clock`, `SESSION_CANCELLED`, shared DTOs.
- Produces:
  - `makeCancelSession(deps)({ sessionId, requesterUserId }): void`
  - `makeListOpenBlocks(deps)({ coachUserId, fromUtc, toUtc }): AvailabilityBlockDTO[]`
  - `makeListSessions(deps)({ userId }): SessionDTO[]`
  - `createBookingModule(db, enrollmentPort, bus, clock): { router: Router }`
  - routes: `POST /availability-blocks`, `GET /availability-blocks`, `GET /coaches`, `GET /coaches/:id/open-blocks`, `POST /sessions`, `POST /sessions/:id/cancel`, `GET /sessions`.

- [ ] **Step 1: Write failing tests `backend/src/modules/booking/cancel-session.test.ts`**

```ts
import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { InMemoryEventBus } from "../../platform/event-bus.js";
import { users, availabilityBlocks } from "../../platform/schema.js";
import { drizzleBlockRepo, drizzleSessionRepo } from "./repo.js";
import { makeBookSession } from "./application/book-session.js";
import { makeCancelSession } from "./application/cancel-session.js";
import { makeListOpenBlocks } from "./application/list-open-blocks.js";
import { SESSION_CANCELLED } from "./events.js";

function setup(nowIso: string) {
  const { db } = createDb(":memory:");
  db.insert(users).values({ id: "c1", displayName: "C", role: "coach", timezone: "America/Toronto", createdAt: nowIso }).run();
  db.insert(users).values({ id: "s1", displayName: "s1", role: "student", timezone: "Europe/Paris", createdAt: nowIso }).run();
  db.insert(availabilityBlocks).values({ id: "b1", coachUserId: "c1", startsAtUtc: "2026-02-02T14:00:00.000Z", endsAtUtc: "2026-02-02T14:30:00.000Z", durationMin: 30, createdAt: nowIso }).run();
  const bus = new InMemoryEventBus();
  const blocks = drizzleBlockRepo(db), sessions = drizzleSessionRepo(db), clock = new FixedClock(nowIso);
  const book = makeBookSession({ blocks, sessions, enrollment: { canBook: async () => true }, bus, clock });
  const cancel = makeCancelSession({ sessions, bus, clock });
  const listOpen = makeListOpenBlocks({ blocks });
  return { db, bus, book, cancel, listOpen };
}

test("cancel ≥24h before frees the slot (it becomes open again)", async () => {
  const { book, cancel, listOpen, bus } = setup("2026-01-20T00:00:00.000Z");
  const cancelled: unknown[] = [];
  bus.subscribe(SESSION_CANCELLED, (e) => cancelled.push(e));
  const s = await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  expect(listOpen({ coachUserId: "c1", fromUtc: "2026-02-01T00:00:00.000Z", toUtc: "2026-02-08T00:00:00.000Z" })).toHaveLength(0);
  cancel({ sessionId: s.id, requesterUserId: "s1" });
  expect(cancelled).toHaveLength(1);
  expect(listOpen({ coachUserId: "c1", fromUtc: "2026-02-01T00:00:00.000Z", toUtc: "2026-02-08T00:00:00.000Z" })).toHaveLength(1);
});

test("cancel <24h before is rejected", async () => {
  const { book, cancel } = setup("2026-02-02T06:00:00.000Z"); // 8h before start
  const s = await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  expect(() => cancel({ sessionId: s.id, requesterUserId: "s1" })).toThrow();
});

test("only the owning student may cancel", async () => {
  const { book, cancel } = setup("2026-01-20T00:00:00.000Z");
  const s = await book({ studentUserId: "s1", availabilityBlockId: "b1" });
  expect(() => cancel({ sessionId: s.id, requesterUserId: "intruder" })).toThrow();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run backend/src/modules/booking/cancel-session.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `backend/src/modules/booking/application/cancel-session.ts`**

```ts
import type { Clock } from "../../../platform/clock.js";
import type { EventBus } from "../../../platform/event-bus.js";
import { CancelWindowPassed, Forbidden, NotFound } from "../../../platform/errors.js";
import { canCancel } from "../domain/rules.js";
import { SESSION_CANCELLED, type SessionEvent } from "../events.js";
import type { SessionRepo } from "../ports.js";

export function makeCancelSession(deps: { sessions: SessionRepo; bus: EventBus; clock: Clock }) {
  return function cancel(input: { sessionId: string; requesterUserId: string }): void {
    const s = deps.sessions.byId(input.sessionId);
    if (!s || s.status !== "confirmed") throw new NotFound("Session");
    if (s.studentUserId !== input.requesterUserId) throw new Forbidden();
    if (!canCancel(s.startsAtUtc, deps.clock.now())) throw new CancelWindowPassed();
    deps.sessions.cancel(s.id, deps.clock.now().toISOString());
    const evt: SessionEvent = { sessionId: s.id, studentUserId: s.studentUserId, coachUserId: s.coachUserId, startsAtUtc: s.startsAtUtc };
    deps.bus.publish(SESSION_CANCELLED, evt);
  };
}
```

- [ ] **Step 4: Implement `backend/src/modules/booking/application/list-open-blocks.ts`**

```ts
import type { AvailabilityBlockDTO } from "@ccu/shared";
import type { AvailabilityBlockRepo } from "../ports.js";

export function makeListOpenBlocks(deps: { blocks: AvailabilityBlockRepo }) {
  return function list(input: { coachUserId: string; fromUtc: string; toUtc: string }): AvailabilityBlockDTO[] {
    return deps.blocks.openInRange(input.coachUserId, input.fromUtc, input.toUtc)
      .map((b) => ({ id: b.id, coachUserId: b.coachUserId, startsAtUtc: b.startsAtUtc, endsAtUtc: b.endsAtUtc, durationMin: b.durationMin }));
  };
}
```

- [ ] **Step 5: Implement `backend/src/modules/booking/application/list-sessions.ts`**

```ts
import type { SessionDTO } from "@ccu/shared";
import type { Clock } from "../../../platform/clock.js";
import type { SessionRepo } from "../ports.js";

export function makeListSessions(deps: { sessions: SessionRepo; clock: Clock }) {
  return function list(input: { userId: string }): SessionDTO[] {
    return deps.sessions.listForUserUpcoming(input.userId, deps.clock.now().toISOString())
      .map((s) => ({ id: s.id, availabilityBlockId: s.availabilityBlockId, studentUserId: s.studentUserId, coachUserId: s.coachUserId, startsAtUtc: s.startsAtUtc, endsAtUtc: s.endsAtUtc, status: s.status }));
  };
}
```

- [ ] **Step 6: Run cancel tests to verify pass**

Run: `npx vitest run backend/src/modules/booking/cancel-session.test.ts`
Expected: PASS.

- [ ] **Step 7: Create `backend/src/modules/booking/routes.ts`**

```ts
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../platform/auth.js";
import { toDTO } from "../identity/ports.js";
import type { UserRepo } from "../identity/ports.js";
import { makePublishAvailability } from "./application/publish-availability.js";
import { makeBookSession } from "./application/book-session.js";
import { makeCancelSession } from "./application/cancel-session.js";
import { makeListOpenBlocks } from "./application/list-open-blocks.js";
import { makeListSessions } from "./application/list-sessions.js";
import type { AvailabilityBlockRepo, EnrollmentPort, SessionRepo } from "./ports.js";
import type { Clock } from "../../platform/clock.js";
import type { EventBus } from "../../platform/event-bus.js";

export function bookingRoutes(deps: {
  blocks: AvailabilityBlockRepo; sessions: SessionRepo; users: UserRepo; enrollment: EnrollmentPort; bus: EventBus; clock: Clock;
}): Router {
  const publish = makePublishAvailability({ blocks: deps.blocks, clock: deps.clock });
  const book = makeBookSession({ blocks: deps.blocks, sessions: deps.sessions, enrollment: deps.enrollment, bus: deps.bus, clock: deps.clock });
  const cancel = makeCancelSession({ sessions: deps.sessions, bus: deps.bus, clock: deps.clock });
  const listOpen = makeListOpenBlocks({ blocks: deps.blocks });
  const listSessions = makeListSessions({ sessions: deps.sessions, clock: deps.clock });
  const r = Router();

  r.get("/coaches", requireAuth, (_req, res) => res.json(deps.users.all().filter((u) => u.role === "coach").map(toDTO)));

  r.post("/availability-blocks", requireAuth, requireRole("coach"), (req, res) => {
    const body = z.object({ startsAtUtc: z.string(), durationMin: z.union([z.literal(30), z.literal(60)]) }).parse(req.body);
    res.status(201).json(publish({ coachUserId: req.principal!.userId, ...body }));
  });
  r.get("/availability-blocks", requireAuth, (req, res) => {
    const q = z.object({ coachId: z.string(), fromUtc: z.string(), toUtc: z.string() }).parse(req.query);
    res.json(deps.blocks.byCoachInRange(q.coachId, q.fromUtc, q.toUtc));
  });
  r.get("/coaches/:id/open-blocks", requireAuth, (req, res) => {
    const q = z.object({ fromUtc: z.string(), toUtc: z.string() }).parse(req.query);
    res.json(listOpen({ coachUserId: req.params.id, ...q }));
  });
  r.post("/sessions", requireAuth, requireRole("student"), async (req, res) => {
    const { availabilityBlockId } = z.object({ availabilityBlockId: z.string() }).parse(req.body);
    res.status(201).json(await book({ studentUserId: req.principal!.userId, availabilityBlockId }));
  });
  r.post("/sessions/:id/cancel", requireAuth, requireRole("student"), (req, res) => {
    cancel({ sessionId: req.params.id, requesterUserId: req.principal!.userId });
    res.json({ ok: true });
  });
  r.get("/sessions", requireAuth, (req, res) => res.json(listSessions({ userId: req.principal!.userId })));
  return r;
}
```

- [ ] **Step 8: Create `backend/src/modules/booking/index.ts`**

```ts
import type { Db } from "../../platform/db.js";
import type { Clock } from "../../platform/clock.js";
import type { EventBus } from "../../platform/event-bus.js";
import type { EnrollmentPort } from "../enrollment/ports.js";
import type { UserRepo } from "../identity/ports.js";
import { drizzleBlockRepo, drizzleSessionRepo } from "./repo.js";
import { bookingRoutes } from "./routes.js";

export function createBookingModule(db: Db, users: UserRepo, enrollment: EnrollmentPort, bus: EventBus, clock: Clock) {
  const router = bookingRoutes({ blocks: drizzleBlockRepo(db), sessions: drizzleSessionRepo(db), users, enrollment, bus, clock });
  return { router };
}
```

- [ ] **Step 9: Typecheck + run the booking suite**

Run: `npx tsc -p backend/tsconfig.json --noEmit && npx vitest run backend/src/modules/booking`
Expected: no type errors; all booking tests PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/src/modules/booking
git commit -m "feat(booking): cancel (24h rule, reopens slot), listings, and HTTP routes"
```

---

## Task 14: Notifications module — event subscribers write tz-aware messages

**Files:**
- Create: `backend/src/modules/notifications/{domain.ts,ports.ts,repo.ts,subscribers.ts,routes.ts,index.ts}`
- Create: `backend/src/modules/notifications/subscribers.test.ts`

**Interfaces:**
- Consumes: `EventBus`, `SESSION_BOOKED`/`SESSION_CANCELLED` + `SessionEvent` (Task 10), `IdentityApi` (for recipient timezone), `formatInZone` (shared), `Db`, `Clock`.
- Produces:
  - `interface NotificationRepo { insert(n); listFor(userId); markRead(id) }`
  - `createNotificationsModule(db, bus, identityApi, clock): { router: Router }` — subscribes on construction.
  - routes: `GET /notifications`, `POST /notifications/:id/read`.

- [ ] **Step 1: Create `backend/src/modules/notifications/ports.ts`**

```ts
import type { NotificationDTO } from "@ccu/shared";
export interface NotificationRow { id: string; recipientUserId: string; type: "session_booked" | "session_cancelled"; message: string; createdAt: string; readAt: string | null; }
export interface NotificationRepo {
  insert(n: NotificationRow): void;
  listFor(userId: string): NotificationRow[];
  markRead(id: string): void;
}
export const toDTO = (n: NotificationRow): NotificationDTO => ({ id: n.id, recipientUserId: n.recipientUserId, type: n.type, message: n.message, createdAt: n.createdAt, readAt: n.readAt });
```

- [ ] **Step 2: Create `backend/src/modules/notifications/repo.ts`**

```ts
import { desc, eq } from "drizzle-orm";
import type { Db } from "../../platform/db.js";
import { notifications } from "../../platform/schema.js";
import type { NotificationRepo, NotificationRow } from "./ports.js";

export function drizzleNotificationRepo(db: Db): NotificationRepo {
  return {
    insert: (n) => { db.insert(notifications).values(n).run(); },
    listFor: (userId) => db.select().from(notifications).where(eq(notifications.recipientUserId, userId)).orderBy(desc(notifications.createdAt)).all() as NotificationRow[],
    markRead: (id) => { db.update(notifications).set({ readAt: new Date().toISOString() }).where(eq(notifications.id, id)).run(); },
  };
}
```

- [ ] **Step 3: Create `backend/src/modules/notifications/subscribers.ts`**

```ts
import { randomUUID } from "node:crypto";
import { formatInZone } from "@ccu/shared";
import type { Clock } from "../../platform/clock.js";
import type { EventBus } from "../../platform/event-bus.js";
import type { IdentityApi } from "../identity/ports.js";
import { SESSION_BOOKED, SESSION_CANCELLED, type SessionEvent } from "../booking/events.js";
import type { NotificationRepo } from "./ports.js";

export function wireNotificationSubscribers(bus: EventBus, repo: NotificationRepo, identity: IdentityApi, clock: Clock): void {
  const write = (recipientUserId: string, type: "session_booked" | "session_cancelled", startsAtUtc: string, verb: string) => {
    const tz = identity.getUser(recipientUserId).timezone;
    repo.insert({
      id: randomUUID(), recipientUserId, type,
      message: `Your session on ${formatInZone(startsAtUtc, tz)} was ${verb}.`,
      createdAt: clock.now().toISOString(), readAt: null,
    });
  };
  bus.subscribe<SessionEvent>(SESSION_BOOKED, (e) => write(e.studentUserId, "session_booked", e.startsAtUtc, "booked"));
  bus.subscribe<SessionEvent>(SESSION_CANCELLED, (e) => write(e.studentUserId, "session_cancelled", e.startsAtUtc, "cancelled"));
}
```

- [ ] **Step 4: Create `backend/src/modules/notifications/routes.ts`**

```ts
import { Router } from "express";
import { requireAuth } from "../../platform/auth.js";
import type { NotificationRepo } from "./ports.js";
import { toDTO } from "./ports.js";

export function notificationRoutes(repo: NotificationRepo): Router {
  const r = Router();
  r.get("/notifications", requireAuth, (req, res) => res.json(repo.listFor(req.principal!.userId).map(toDTO)));
  r.post("/notifications/:id/read", requireAuth, (req, res) => { repo.markRead(req.params.id); res.json({ ok: true }); });
  return r;
}
```

- [ ] **Step 5: Create `backend/src/modules/notifications/index.ts`**

```ts
import type { Db } from "../../platform/db.js";
import type { Clock } from "../../platform/clock.js";
import type { EventBus } from "../../platform/event-bus.js";
import type { IdentityApi } from "../identity/ports.js";
import { drizzleNotificationRepo } from "./repo.js";
import { wireNotificationSubscribers } from "./subscribers.js";
import { notificationRoutes } from "./routes.js";

export function createNotificationsModule(db: Db, bus: EventBus, identity: IdentityApi, clock: Clock) {
  const repo = drizzleNotificationRepo(db);
  wireNotificationSubscribers(bus, repo, identity, clock);
  return { router: notificationRoutes(repo) };
}
```

- [ ] **Step 6: Write test `backend/src/modules/notifications/subscribers.test.ts`**

```ts
import { expect, test } from "vitest";
import { createDb } from "../../platform/db.js";
import { FixedClock } from "../../platform/clock.js";
import { InMemoryEventBus } from "../../platform/event-bus.js";
import { createIdentityModule } from "../identity/index.js";
import { createNotificationsModule } from "./index.js";
import { drizzleNotificationRepo } from "./repo.js";
import { SESSION_BOOKED } from "../booking/events.js";

test("a SessionBooked event writes a tz-localized message to the student", () => {
  const { db } = createDb(":memory:");
  const clock = new FixedClock("2026-01-01T00:00:00.000Z");
  const identity = createIdentityModule(db, clock).api;
  const student = identity.createAccount({ displayName: "Zoe", role: "student", timezone: "America/Vancouver" });
  const bus = new InMemoryEventBus();
  createNotificationsModule(db, bus, identity, clock);

  bus.publish(SESSION_BOOKED, { sessionId: "x", studentUserId: student.id, coachUserId: "c1", startsAtUtc: "2026-02-01T18:00:00.000Z" });
  const notes = drizzleNotificationRepo(db).listFor(student.id);
  expect(notes).toHaveLength(1);
  expect(notes[0]!.message).toContain("10:00"); // 18:00Z in Vancouver (PST, -08) = 10:00 AM
  expect(notes[0]!.type).toBe("session_booked");
});
```

- [ ] **Step 7: Run test**

Run: `npx vitest run backend/src/modules/notifications/subscribers.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/notifications
git commit -m "feat(notifications): event subscribers writing timezone-localized in-app messages"
```

---

## Task 15: Composition root, seed data, dev boot, API smoke test

**Files:**
- Create: `backend/src/main.ts`, `backend/src/seed.ts`, `backend/src/test-support/app.ts`
- Create: `backend/src/api.smoke.test.ts`

**Interfaces:**
- Consumes: all four `create*Module` factories, `createDb`, `createApp`/`mountErrorMapper`, `InMemoryEventBus`, `SystemClock`, `wallTimeToUtcIso`.
- Produces:
  - `buildApp(db, clock): { app, enrollment }` used by both `main.ts` and tests.
  - `seed(db, clock)` populating coaches/students/blocks/one booking.
  - running server on `config.port`.

- [ ] **Step 1: Create `backend/src/test-support/app.ts`**

```ts
import type { Db } from "../platform/db.js";
import type { Clock } from "../platform/clock.js";
import { createApp, mountErrorMapper } from "../platform/http.js";
import { InMemoryEventBus } from "../platform/event-bus.js";
import { createIdentityModule } from "../modules/identity/index.js";
import { createEnrollmentModule } from "../modules/enrollment/index.js";
import { createBookingModule } from "../modules/booking/index.js";
import { createNotificationsModule } from "../modules/notifications/index.js";

export function buildApp(db: Db, clock: Clock) {
  const bus = new InMemoryEventBus();
  const identity = createIdentityModule(db, clock);
  const enrollment = createEnrollmentModule(db, identity.api, clock);
  const booking = createBookingModule(db, identity.repo, enrollment.port, bus, clock);
  const notifications = createNotificationsModule(db, bus, identity.api, clock);

  const app = createApp();
  app.use(identity.router);
  app.use(enrollment.router);
  app.use(booking.router);
  app.use(notifications.router);
  mountErrorMapper(app);
  return { app, identity, enrollment };
}
```

- [ ] **Step 2: Create `backend/src/seed.ts`**

```ts
import { createDb } from "./platform/db.js";
import { SystemClock } from "./platform/clock.js";
import { wallTimeToUtcIso } from "@ccu/shared";
import { createIdentityModule } from "./modules/identity/index.js";
import { createEnrollmentModule } from "./modules/enrollment/index.js";
import { drizzleBlockRepo } from "./modules/booking/repo.js";
import { randomUUID } from "node:crypto";

export function seed(dbPath: string) {
  const { db } = createDb(dbPath);
  const clock = SystemClock;
  const identity = createIdentityModule(db, clock).api;
  const enrollment = createEnrollmentModule(db, identity, clock).service;

  const coaches = [
    identity.createAccount({ displayName: "Coach Toronto", role: "coach", timezone: "America/Toronto" }),
    identity.createAccount({ displayName: "Coach Vancouver", role: "coach", timezone: "America/Vancouver" }),
    identity.createAccount({ displayName: "Coach Paris", role: "coach", timezone: "Europe/Paris" }),
  ];
  identity.createAccount({ displayName: "Enrollment Admin", role: "enrollment_admin", timezone: "America/Toronto" });
  const active = enrollment.register("Active Student", "America/Vancouver");
  const suspended = enrollment.register("Suspended Student", "Europe/Paris");
  enrollment.setStatus(suspended.studentUserId, "suspended");

  const blocks = drizzleBlockRepo(db);
  // Next two weeks of 9:00/10:00 local blocks per coach (each coach's own tz).
  const days = [2, 3, 4, 9, 10, 11];
  for (const c of coaches) {
    for (const d of days) {
      for (const [hh, dur] of [["09:00", 30], ["10:00", 60]] as const) {
        const date = `2026-02-${String(d).padStart(2, "0")}T${hh}`;
        const startsAtUtc = wallTimeToUtcIso(date, c.timezone);
        const endsAtUtc = wallTimeToUtcIso(`2026-02-${String(d).padStart(2, "0")}T${hh === "09:00" ? "09:30" : "11:00"}`, c.timezone);
        blocks.insert({ id: randomUUID(), coachUserId: c.id, startsAtUtc, endsAtUtc, durationMin: dur, createdAt: clock.now().toISOString() });
      }
    }
  }
  console.log(`Seeded: ${coaches.length} coaches, 1 admin, active=${active.studentUserId}, suspended=${suspended.studentUserId}`);
}

// Run standalone: `npm run seed`
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seed(process.env.DB_PATH ?? "backend/data/dev.sqlite");
}
```

- [ ] **Step 3: Create `backend/src/main.ts`**

```ts
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
```

- [ ] **Step 4: Write `backend/src/api.smoke.test.ts`**

```ts
import { expect, test } from "vitest";
import request from "supertest";
import { createDb } from "./platform/db.js";
import { FixedClock } from "./platform/clock.js";
import { buildApp } from "./test-support/app.js";

test("end-to-end: admin registers → coach publishes → student books → cancels → sees a notification", async () => {
  const { db } = createDb(":memory:");
  const { app, identity } = buildApp(db, new FixedClock("2026-01-20T00:00:00.000Z"));

  const coach = identity.api.createAccount({ displayName: "Coach", role: "coach", timezone: "America/Toronto" });
  const admin = identity.api.createAccount({ displayName: "Admin", role: "enrollment_admin", timezone: "America/Toronto" });

  const token = async (id: string) => (await request(app).post("/auth/login").send({ userId: id })).body.token as string;
  const adminTok = await token(admin.id);
  const coachTok = await token(coach.id);

  // admin registers a student
  const reg = await request(app).post("/students").set("authorization", `Bearer ${adminTok}`).send({ displayName: "Zoe", timezone: "Europe/Paris" });
  expect(reg.status).toBe(201);
  const studentId = reg.body.studentUserId;
  const studentTok = await token(studentId);

  // coach publishes a block well in the future
  const pub = await request(app).post("/availability-blocks").set("authorization", `Bearer ${coachTok}`).send({ startsAtUtc: "2026-02-10T14:00:00.000Z", durationMin: 30 });
  expect(pub.status).toBe(201);
  const blockId = pub.body.id;

  // student books it
  const book = await request(app).post("/sessions").set("authorization", `Bearer ${studentTok}`).send({ availabilityBlockId: blockId });
  expect(book.status).toBe(201);

  // student cancels (≥24h before)
  const cancel = await request(app).post(`/sessions/${book.body.id}/cancel`).set("authorization", `Bearer ${studentTok}`).send();
  expect(cancel.status).toBe(200);

  // student has two notifications (booked + cancelled)
  const notes = await request(app).get("/notifications").set("authorization", `Bearer ${studentTok}`);
  expect(notes.body).toHaveLength(2);
});
```

- [ ] **Step 5: Run the full backend suite**

Run: `npx vitest run backend`
Expected: all backend tests PASS, including the smoke test.

- [ ] **Step 6: Verify dev boot works**

Run: `npm run seed --workspace backend` then start `npm run dev --workspace backend` briefly; confirm it logs `API on http://localhost:3001`. Stop it.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main.ts backend/src/seed.ts backend/src/test-support backend/src/api.smoke.test.ts
git commit -m "feat(backend): composition root, seed data, dev boot, end-to-end API smoke test"
```

---

## Task 16: Frontend scaffold — Vite, providers, API client, auth, role routing

**Files:**
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`
- Create: `frontend/src/main.tsx`, `frontend/src/app/{App.tsx,auth-context.tsx,routes.tsx}`
- Create: `frontend/src/shared/{api.ts,ui.tsx}`, `frontend/src/features/auth/{LoginPicker.tsx,useMe.ts}`

**Interfaces:**
- Consumes: backend REST, `@ccu/shared` DTOs.
- Produces: a running SPA; `api` client; `AuthProvider`/`useAuth`; role-based routes.

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "@ccu/frontend",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@ccu/shared": "*",
    "@tanstack/react-query": "^5.59.0",
    "luxon": "^3.5.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.27.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/luxon": "^3.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`**

`frontend/tsconfig.json`:
```json
{ "extends": "../tsconfig.base.json", "compilerOptions": { "jsx": "react-jsx" }, "include": ["src"] }
```
`frontend/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target: "http://localhost:3001", rewrite: (p) => p.replace(/^\/api/, "") } } },
  test: { environment: "jsdom" },
});
```
`frontend/index.html`:
```html
<!doctype html><html><head><meta charset="utf-8"><title>Coaching Booking</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```

- [ ] **Step 3: Create `frontend/src/shared/api.ts`**

```ts
import type { ApiError } from "@ccu/shared";

let token: string | null = null;
export const setToken = (t: string | null) => { token = t; };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
  if (!res.ok) { const err = (await res.json()) as ApiError; throw new Error(err.message ?? "Request failed"); }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
```

- [ ] **Step 4: Create `frontend/src/app/auth-context.tsx`**

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { UserDTO } from "@ccu/shared";
import { api, setToken } from "../shared/api.js";

interface AuthState { user: UserDTO | null; login: (userId: string) => Promise<void>; logout: () => void; }
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const value = useMemo<AuthState>(() => ({
    user,
    login: async (userId) => {
      const { token, user } = await api<{ token: string; user: UserDTO }>("/auth/login", { method: "POST", body: JSON.stringify({ userId }) });
      setToken(token); setUser(user);
    },
    logout: () => { setToken(null); setUser(null); },
  }), [user]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error("useAuth outside provider"); return c; };
```

- [ ] **Step 5: Create `frontend/src/features/auth/{LoginPicker.tsx,useMe.ts}`**

`LoginPicker.tsx`:
```tsx
import { useQuery } from "@tanstack/react-query";
import type { UserDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";
import { useAuth } from "../../app/auth-context.js";

export function LoginPicker() {
  const { user, login, logout } = useAuth();
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => api<UserDTO[]>("/users") });
  if (user) return <div>Signed in as <b>{user.displayName}</b> ({user.role}, {user.timezone}) <button onClick={logout}>Switch user</button></div>;
  return (
    <div>
      <h2>Pick a user to sign in</h2>
      <ul>{users.map((u) => <li key={u.id}><button onClick={() => login(u.id)}>{u.displayName} — {u.role} ({u.timezone})</button></li>)}</ul>
    </div>
  );
}
```
`useMe.ts`:
```ts
import { useAuth } from "../../app/auth-context.js";
export const useMe = () => useAuth().user;
```

- [ ] **Step 6: Create `frontend/src/app/{routes.tsx,App.tsx}` and `frontend/src/main.tsx`**

`routes.tsx`:
```tsx
import type { ReactNode } from "react";
import { useMe } from "../features/auth/useMe.js";
import type { Role } from "@ccu/shared";
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const me = useMe();
  if (!me || me.role !== role) return null;
  return <>{children}</>;
}
```
`App.tsx`:
```tsx
import { LoginPicker } from "../features/auth/LoginPicker.js";
import { RoleGate } from "./routes.js";
// Feature panels are added in later tasks; import and drop them into the gates below.
export function App() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Coaching Session Booking</h1>
      <LoginPicker />
      <RoleGate role="coach"><section id="coach-area" /></RoleGate>
      <RoleGate role="student"><section id="student-area" /></RoleGate>
      <RoleGate role="enrollment_admin"><section id="admin-area" /></RoleGate>
    </main>
  );
}
```
`main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./app/auth-context.js";
import { App } from "./app/App.js";

const qc = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <StrictMode><QueryClientProvider client={qc}><AuthProvider><App /></AuthProvider></QueryClientProvider></StrictMode>,
);
```

- [ ] **Step 7: Install and verify dev server boots**

Run: `npm install` then `npm run dev --workspace frontend`
Expected: Vite serves on `http://localhost:5173`; with the backend running, the user list loads and you can sign in. Stop it.

- [ ] **Step 8: Commit**

```bash
git add frontend package.json package-lock.json
git commit -m "feat(frontend): vite scaffold, api client, auth context, role-gated shell"
```

---

## Task 17: Frontend features — availability (coach) + booking (student, tz-aware grid)

**Files:**
- Create: `frontend/src/features/availability/{api.ts,PublishForm.tsx,MyBlocks.tsx}`
- Create: `frontend/src/features/booking/{api.ts,CoachList.tsx,WeekGrid.tsx}`
- Create: `frontend/src/features/booking/WeekGrid.test.tsx`
- Modify: `frontend/src/app/App.tsx` (drop panels into the role gates)

**Interfaces:**
- Consumes: `api`, `useMe`, shared `weekBoundsUtc`/`formatInZone`/`wallTimeToUtcIso`, DTOs.
- Produces: coach can publish + see blocks; student can pick a coach and book an open slot rendered in their own timezone.

- [ ] **Step 1: Create `frontend/src/features/availability/api.ts`**

```ts
import type { AvailabilityBlockDTO, DurationMinutes } from "@ccu/shared";
import { api } from "../../shared/api.js";
export const publishBlock = (startsAtUtc: string, durationMin: DurationMinutes) =>
  api<AvailabilityBlockDTO>("/availability-blocks", { method: "POST", body: JSON.stringify({ startsAtUtc, durationMin }) });
export const myBlocks = (coachId: string, fromUtc: string, toUtc: string) =>
  api<AvailabilityBlockDTO[]>(`/availability-blocks?coachId=${coachId}&fromUtc=${encodeURIComponent(fromUtc)}&toUtc=${encodeURIComponent(toUtc)}`);
```

- [ ] **Step 2: Create `frontend/src/features/availability/PublishForm.tsx`**

```tsx
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { wallTimeToUtcIso } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { publishBlock } from "./api.js";

export function PublishForm() {
  const me = useMe()!;
  const qc = useQueryClient();
  const [local, setLocal] = useState("2026-02-10T09:00");
  const [dur, setDur] = useState<30 | 60>(30);
  const m = useMutation({
    mutationFn: () => publishBlock(wallTimeToUtcIso(local, me.timezone), dur),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-blocks"] }),
    onError: (e: Error) => alert(e.message),
  });
  return (
    <div>
      <h3>Publish availability ({me.timezone})</h3>
      <input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} />
      <select value={dur} onChange={(e) => setDur(Number(e.target.value) as 30 | 60)}><option value={30}>30 min</option><option value={60}>60 min</option></select>
      <button onClick={() => m.mutate()}>Publish</button>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/features/availability/MyBlocks.tsx`**

```tsx
import { useQuery } from "@tanstack/react-query";
import { formatInZone, weekBoundsUtc } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { myBlocks } from "./api.js";

export function MyBlocks() {
  const me = useMe()!;
  const { fromUtc, toUtc } = weekBoundsUtc("2026-02-10T12:00:00.000Z", me.timezone);
  const { data = [] } = useQuery({ queryKey: ["my-blocks", me.id, fromUtc], queryFn: () => myBlocks(me.id, fromUtc, toUtc) });
  return <div><h3>My blocks this week</h3><ul>{data.map((b) => <li key={b.id}>{formatInZone(b.startsAtUtc, me.timezone)} ({b.durationMin}m)</li>)}</ul></div>;
}
```

- [ ] **Step 4: Create `frontend/src/features/booking/api.ts`**

```ts
import type { AvailabilityBlockDTO, SessionDTO, UserDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";
export const listCoaches = () => api<UserDTO[]>("/coaches");
export const openBlocks = (coachId: string, fromUtc: string, toUtc: string) =>
  api<AvailabilityBlockDTO[]>(`/coaches/${coachId}/open-blocks?fromUtc=${encodeURIComponent(fromUtc)}&toUtc=${encodeURIComponent(toUtc)}`);
export const bookBlock = (availabilityBlockId: string) =>
  api<SessionDTO>("/sessions", { method: "POST", body: JSON.stringify({ availabilityBlockId }) });
```

- [ ] **Step 5: Create `frontend/src/features/booking/WeekGrid.tsx`**

```tsx
import { formatInZone } from "@ccu/shared";
import type { AvailabilityBlockDTO } from "@ccu/shared";

export function WeekGrid({ blocks, viewerTz, onBook }: { blocks: AvailabilityBlockDTO[]; viewerTz: string; onBook: (id: string) => void }) {
  if (blocks.length === 0) return <p>No open times this week.</p>;
  return (
    <ul>
      {blocks.map((b) => (
        <li key={b.id}>{formatInZone(b.startsAtUtc, viewerTz)} ({b.durationMin}m) <button onClick={() => onBook(b.id)}>Book</button></li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Create `frontend/src/features/booking/CoachList.tsx`**

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { weekBoundsUtc } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { listCoaches, openBlocks, bookBlock } from "./api.js";
import { WeekGrid } from "./WeekGrid.js";

export function CoachList() {
  const me = useMe()!;
  const qc = useQueryClient();
  const [coachId, setCoachId] = useState<string | null>(null);
  const { data: coaches = [] } = useQuery({ queryKey: ["coaches"], queryFn: listCoaches });
  const { fromUtc, toUtc } = weekBoundsUtc("2026-02-10T12:00:00.000Z", me.timezone);
  const { data: blocks = [] } = useQuery({ enabled: !!coachId, queryKey: ["open-blocks", coachId, fromUtc], queryFn: () => openBlocks(coachId!, fromUtc, toUtc) });
  const book = useMutation({
    mutationFn: bookBlock,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["open-blocks"] }); qc.invalidateQueries({ queryKey: ["my-sessions"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
    onError: (e: Error) => alert(e.message),
  });
  return (
    <div>
      <h3>Find a coach (times shown in {me.timezone})</h3>
      <select value={coachId ?? ""} onChange={(e) => setCoachId(e.target.value || null)}>
        <option value="">Choose a coach…</option>
        {coaches.map((c) => <option key={c.id} value={c.id}>{c.displayName} ({c.timezone})</option>)}
      </select>
      {coachId && <WeekGrid blocks={blocks} viewerTz={me.timezone} onBook={(id) => book.mutate(id)} />}
    </div>
  );
}
```

- [ ] **Step 7: Write component test `frontend/src/features/booking/WeekGrid.test.tsx`**

```tsx
import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekGrid } from "./WeekGrid.js";

test("renders a block in the viewer's timezone", () => {
  render(<WeekGrid viewerTz="America/Vancouver" onBook={vi.fn()} blocks={[
    { id: "b1", coachUserId: "c1", startsAtUtc: "2026-02-10T18:00:00.000Z", endsAtUtc: "2026-02-10T18:30:00.000Z", durationMin: 30 },
  ]} />);
  // 18:00Z in Vancouver (PST) = 10:00 AM
  expect(screen.getByText(/10:00/)).toBeTruthy();
});
```

- [ ] **Step 8: Wire panels into `frontend/src/app/App.tsx`**

Replace the empty `<section>` placeholders:
```tsx
import { LoginPicker } from "../features/auth/LoginPicker.js";
import { RoleGate } from "./routes.js";
import { PublishForm } from "../features/availability/PublishForm.js";
import { MyBlocks } from "../features/availability/MyBlocks.js";
import { CoachList } from "../features/booking/CoachList.js";

export function App() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Coaching Session Booking</h1>
      <LoginPicker />
      <RoleGate role="coach"><PublishForm /><MyBlocks /></RoleGate>
      <RoleGate role="student"><CoachList /></RoleGate>
      <RoleGate role="enrollment_admin"><section id="admin-area" /></RoleGate>
    </main>
  );
}
```

- [ ] **Step 9: Run the component test**

Run: `npx vitest run frontend/src/features/booking/WeekGrid.test.tsx`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/features/availability frontend/src/features/booking frontend/src/app/App.tsx
git commit -m "feat(frontend): coach availability publishing + student booking with tz-aware week grid"
```

---

## Task 18: Frontend features — sessions (cancel), notifications, enrollment admin + README

**Files:**
- Create: `frontend/src/features/sessions/{api.ts,UpcomingList.tsx}`
- Create: `frontend/src/features/notifications/{api.ts,Inbox.tsx}`
- Create: `frontend/src/features/enrollment-admin/{api.ts,StudentAdmin.tsx}`
- Modify: `frontend/src/app/App.tsx`
- Create: `README.md`

**Interfaces:**
- Consumes: `api`, `useMe`, shared `formatInZone`/`canCancel`-equivalent (compute client-side), DTOs.
- Produces: upcoming sessions with a 24h-aware cancel button; notifications inbox; admin register/suspend/reactivate; full README.

- [ ] **Step 1: Create `frontend/src/features/sessions/api.ts`**

```ts
import type { SessionDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";
export const mySessions = () => api<SessionDTO[]>("/sessions");
export const cancelSession = (id: string) => api<{ ok: true }>(`/sessions/${id}/cancel`, { method: "POST" });
```

- [ ] **Step 2: Create `frontend/src/features/sessions/UpcomingList.tsx`**

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatInZone } from "@ccu/shared";
import { useMe } from "../auth/useMe.js";
import { mySessions, cancelSession } from "./api.js";

const canCancelNow = (startsAtUtc: string) => new Date(startsAtUtc).getTime() - Date.now() >= 24 * 3600_000;

export function UpcomingList() {
  const me = useMe()!;
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["my-sessions"], queryFn: mySessions });
  const cancel = useMutation({
    mutationFn: cancelSession,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-sessions"] }); qc.invalidateQueries({ queryKey: ["open-blocks"] }); qc.invalidateQueries({ queryKey: ["notifications"] }); },
    onError: (e: Error) => alert(e.message),
  });
  return (
    <div>
      <h3>Upcoming sessions ({me.timezone})</h3>
      <ul>{data.map((s) => (
        <li key={s.id}>{formatInZone(s.startsAtUtc, me.timezone)}
          {me.role === "student" && <button disabled={!canCancelNow(s.startsAtUtc)} onClick={() => cancel.mutate(s.id)}>Cancel</button>}
          {!canCancelNow(s.startsAtUtc) && me.role === "student" && <small> (within 24h — cannot cancel)</small>}
        </li>
      ))}</ul>
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/features/notifications/{api.ts,Inbox.tsx}`**

`api.ts`:
```ts
import type { NotificationDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";
export const myNotifications = () => api<NotificationDTO[]>("/notifications");
```
`Inbox.tsx`:
```tsx
import { useQuery } from "@tanstack/react-query";
import { myNotifications } from "./api.js";
export function Inbox() {
  const { data = [] } = useQuery({ queryKey: ["notifications"], queryFn: myNotifications });
  const unread = data.filter((n) => !n.readAt).length;
  return <div><h3>Messages {unread > 0 && <span>({unread} new)</span>}</h3><ul>{data.map((n) => <li key={n.id}>{n.message}</li>)}</ul></div>;
}
```

- [ ] **Step 4: Create `frontend/src/features/enrollment-admin/{api.ts,StudentAdmin.tsx}`**

`api.ts`:
```ts
import type { EnrollmentDTO } from "@ccu/shared";
import { api } from "../../shared/api.js";
export const listStudents = () => api<{ studentUserId: string; status: "active" | "suspended" }[]>("/students");
export const registerStudent = (displayName: string, timezone: string) =>
  api("/students", { method: "POST", body: JSON.stringify({ displayName, timezone }) });
export const setStatus = (id: string, action: "suspend" | "reactivate") =>
  api(`/students/${id}/${action}`, { method: "POST" });
```
`StudentAdmin.tsx`:
```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStudents, registerStudent, setStatus } from "./api.js";

const ZONES = ["America/Toronto", "America/Vancouver", "Europe/Paris"];

export function StudentAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [tz, setTz] = useState(ZONES[0]);
  const { data = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const inv = () => qc.invalidateQueries({ queryKey: ["students"] });
  const reg = useMutation({ mutationFn: () => registerStudent(name, tz), onSuccess: inv, onError: (e: Error) => alert(e.message) });
  const st = useMutation({ mutationFn: ({ id, a }: { id: string; a: "suspend" | "reactivate" }) => setStatus(id, a), onSuccess: inv });
  return (
    <div>
      <h3>Enrollment admin</h3>
      <input placeholder="Student name" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={tz} onChange={(e) => setTz(e.target.value)}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
      <button onClick={() => reg.mutate()}>Register</button>
      <ul>{data.map((s) => (
        <li key={s.studentUserId}>{s.studentUserId.slice(0, 8)} — {s.status}
          {s.status === "active"
            ? <button onClick={() => st.mutate({ id: s.studentUserId, a: "suspend" })}>Suspend</button>
            : <button onClick={() => st.mutate({ id: s.studentUserId, a: "reactivate" })}>Reactivate</button>}
        </li>
      ))}</ul>
    </div>
  );
}
```

- [ ] **Step 5: Wire everything into `frontend/src/app/App.tsx`**

```tsx
import { LoginPicker } from "../features/auth/LoginPicker.js";
import { RoleGate } from "./routes.js";
import { PublishForm } from "../features/availability/PublishForm.js";
import { MyBlocks } from "../features/availability/MyBlocks.js";
import { CoachList } from "../features/booking/CoachList.js";
import { UpcomingList } from "../features/sessions/UpcomingList.js";
import { Inbox } from "../features/notifications/Inbox.js";
import { StudentAdmin } from "../features/enrollment-admin/StudentAdmin.js";

export function App() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Coaching Session Booking</h1>
      <LoginPicker />
      <RoleGate role="coach"><PublishForm /><MyBlocks /><UpcomingList /></RoleGate>
      <RoleGate role="student"><CoachList /><UpcomingList /><Inbox /></RoleGate>
      <RoleGate role="enrollment_admin"><StudentAdmin /></RoleGate>
    </main>
  );
}
```

- [ ] **Step 6: Run the whole test suite**

Run: `npm test`
Expected: all workspace tests PASS (shared, backend, frontend).

- [ ] **Step 7: Manual smoke through the UI**

Run: `npm run dev` (backend + frontend). As a coach: publish a block. As the active student: book it (slot disappears), see a notification, cancel if ≥24h away. As admin: suspend the student, confirm they can no longer book. Stop the servers.

- [ ] **Step 8: Write `README.md`**

Write a README covering (use real content, not placeholders): project summary; **install/run/test** (`npm install`, `npm run dev`, `npm test`); the module structure and *why* (modular monolith, ports + events, the four contexts, extraction story); **business rules** and where each is enforced (DB index for double-booking; domain for the rest; the honest concurrency trade-off); **timezones** (server speaks UTC, client converts at three edges); **assumptions & omissions** (no passwords, students-only suspension, in-memory event bus, UI unstyled); **what's next** (durable outbox, Postgres + exclusion constraints, SMS/email channels, rescheduling, pagination, real credentials); **AI tools used** (Claude Code — brainstorming the design, writing the spec/plan, generating code under review); and **other tech choices** (Express, Drizzle, better-sqlite3, Luxon, Vitest, Node 22, npm workspaces, React Query).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features frontend/src/app/App.tsx README.md
git commit -m "feat(frontend): sessions+cancel, notifications inbox, enrollment admin; add README"
```

---

## Self-Review

- **Spec coverage:** coach availability (T11), 30/60 blocks (T9), no-overlap (T11), student browse-by-week-in-own-tz (T13/T17), book (T12), no double-booking (T4+T12), max-3 (T12), cancel ≥24h + reopen slot (T13), suspended-can't-book (T8+T12), notifications on book/cancel (T14), enrollment register/suspend/reactivate (T8/T18), simple JWT auth + roles (T6/T7), timezones TO/VAN/PAR (T2 + seed T15), seed data (T15), tests for every rule (T2–T15), README + one-command scripts (T1/T15/T18). All spec sections map to a task.
- **Placeholder scan:** no TBD/TODO; every code step carries real code; the README step enumerates exact required content.
- **Type consistency:** `EnrollmentPort.canBook` (T8) consumed verbatim in T12; `SessionEvent` fields (T10) used identically in T12/T13/T14; `UserRepo`/`toDTO` (T7) reused in T13 routes and T15; DTO names match `@ccu/shared` (T3) throughout.
