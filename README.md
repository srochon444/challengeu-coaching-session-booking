# Coaching Session Booking

A booking product for one-on-one coaching: coaches publish availability, students book and cancel sessions across timezones, an enrollment team controls access, and everyone gets in-app notifications. Built as a **modular monolith** in TypeScript (strict), backend + frontend in one repo.

> **Status:** built in vertical slices, each a working end-to-end feature. See [Delivery progress](#delivery-progress). This README is kept in step with what is actually implemented.

## Quick start

Requires **Node 22** (`.nvmrc`).

```bash
npm install     # install all workspaces
npm run dev      # backend on :3001, frontend on :5173 (fresh DB auto-seeded on boot)
npm test         # run the whole test suite (shared + backend + frontend)
```

Open http://localhost:5173, pick a seeded user to sign in, and try the features for that role.

**Seed data** is generated **relative to when you launch** (so it's always upcoming): **3 coaches** (Toronto / Vancouver / Paris) — each with **~10 availability blocks** spread across the coming weekdays (**Mon–Fri, 08:00–17:00 in the coach's own timezone**, mixed 30/60-min, no overlaps) — plus **7 students** and **1 enrollment admin**.

## Delivery progress

| Slice | Feature | Status |
|-------|---------|--------|
| 1 | Foundation + authentication (pick a user → signed in, role-aware) | ✅ done |
| 2 | Coach publishes availability (30/60-min blocks, own timezone) + sees it | ✅ done |
| 3 | Student books an open slot (no double-booking, max 3, suspended can't book) | ✅ done |
| 4 | Cancel a session (≥24h rule, slot reopens) | ⏳ next |
| 5 | In-app notifications on book/cancel | ⏳ |
| 6 | Enrollment admin: register / suspend / reactivate students | ⏳ |

## Architecture

A single deployable app split into **bounded-context modules** with hard boundaries, so the two domains the business plans to extract next year (enrollment, messaging) are a folder move + a port swap, not a rewrite.

```
shared/                 wire DTOs + pure timezone helpers (used by both ends)
backend/src/
  platform/             cross-cutting: db, schema, event bus, http, JWT auth, errors, clock
  modules/
    identity/           accounts + roles + login (the "simple auth")
    booking/            CORE: availability, sessions, booking rules
    enrollment/         SUPPORTING — student access status (canBook)
    notifications/      SUPPORTING — in-app messages                  (slice 5)
  main.ts               composition root — the only file that wires all modules
frontend/src/
  app/                  providers (Mantine, React Query), auth context, role-gated shell
  shared/               api client, (tz via @ccu/shared)
  features/             one folder per backend module (auth, availability, …)
```

**Rules that keep the boundaries real:**
- A module is reached only through its `ports/` interfaces or the event bus — never by importing another module's internals.
- Dependencies point inward: `domain/` imports nothing; `application/` uses `domain` + `ports`; `adapters` implement `ports`.
- Synchronous cross-module reads go through a **query port**; reactions go through **domain events** on an in-process bus. Both swap to HTTP when a module is extracted, with no change to the caller.

## Business rules & where they are enforced

| Rule | Enforcement | Status |
|------|-------------|--------|
| No double-booking (one coach + one student per slot) | **DB partial unique index** — the race is impossible by construction | ✅ |
| A coach's availability blocks never overlap | domain `blocksOverlap()` at publish time | ✅ |
| Availability must start in the future (no past slots) | domain `isInFuture()` at publish time (picker also enforces `min`) | ✅ |
| A coach may remove a slot only if no student has booked it | `removeAvailability` use-case checks owner + no confirmed session | ✅ |
| Blocks are 30 or 60 minutes only | `Duration` value object | ✅ |
| Max 3 upcoming sessions per student | domain rule checked in the booking use-case | ✅ |
| Cancel only ≥ 24h before start; cancelling reopens the slot | pure `canCancel()` | ⏳ slice 4 |
| Suspended student can view but not book | `EnrollmentPort.canBook()` | ✅ |

**Honest trade-off:** only double-booking gets a database-level guarantee (the partial unique index). Overlap and max-3 are check-then-act inside a transaction — correct under SQLite's serialized writes; on high-concurrency Postgres I'd add exclusion constraints / explicit locking.

## Timezones

The server stores and reasons in **UTC only**. Each user has a home IANA zone. The React client converts at three edges: a coach publishes in their own wall-clock time (→ UTC), any viewer sees instants rendered in their zone, and a "week" is computed in the viewer's zone before querying. DST is handled by storing zone **names** (not offsets) and converting via Luxon. This keeps every rule (the 24h window, overlap, "is it in the future") timezone-independent and correct for everyone.

## Authentication

A deliberately simple mechanism per the assignment: `GET /users` lists everyone, `POST /auth/login {userId}` mints a signed **JWT** carrying `{ userId, role }` (no passwords), and middleware enforces role-based route guards. Authentication (can you log in) is kept separate from access status (can you book) — the latter will live in the enrollment module, which is why a suspended student can still sign in and view.

## Tech choices (beyond the required TypeScript/Git)

- **Backend server:** Express — minimal, explicit, lets the module structure show.
- **ORM / DB:** Drizzle + better-sqlite3 (local file; `:memory:` in tests). No cloud, per scope.
- **Auth:** jsonwebtoken. **Validation:** zod at the HTTP edge.
- **Timezones:** Luxon.
- **Frontend:** React + Vite, **React Query** (server state), **Mantine v7** (accessible components — pinned to v7 to stay on React 18; styling kept restrained since visual design is out of scope).
- **Tests:** Vitest (both ends) + supertest.
- **Monorepo:** npm workspaces. **Node:** 22 LTS.

## Testing

`npm test` runs everything. The suite is organized to prove the business rules: pure domain unit tests (overlap, duration, cancel window, DST-aware tz helpers), and integration tests against real SQLite (including a test that the partial unique index rejects a second confirmed booking on the same slot). API behavior is checked with supertest.

## Assumptions & things intentionally left out

- Simple auth (user picker + JWT), no passwords or sign-up.
- Suspension applies to students only (the business only described that).
- In-process event bus (a real extraction would use a durable outbox/queue).
- Local SQLite, no cloud DB, no deployment, no real SMS/email, no payments, minimal styling — all out of scope.

## AI tools used

Built with **Claude Code** (Opus): brainstorming the architecture, writing the design spec and the slice-by-slice implementation plan, and generating code under review via a strict TDD loop (failing test → minimal implementation → verify → commit). Every line was reviewed and is explainable.

## Repo docs

- Design spec: `docs/superpowers/specs/2026-11-25-coaching-session-booking-design.md`
- Implementation plan (vertical slices): `docs/superpowers/plans/2026-11-25-coaching-session-booking.md`
