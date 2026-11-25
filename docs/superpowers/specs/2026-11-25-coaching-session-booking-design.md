# Coaching Session Booking — Design

**Date:** 2026-11-25
**Context:** ChallengeU take-home (Senior Full-stack). Build the first version of a
coaching-session booking product to replace text-message booking + a shared spreadsheet.
Graded on *how* it is built — modularity, clear expression of business rules, tests, and
explained decisions — not feature count or visual polish.

## Goals & constraints

- Coaches publish availability in 30/60-minute blocks; are never double-booked.
- Students browse a coach's open times for a week **in their own timezone**, book one, see
  upcoming sessions, cancel (≥24h before).
- Students get an in-app message whenever a session of theirs is booked or cancelled.
- Enrollment team registers students and suspends/reactivates access.
- TypeScript strict, backend + frontend, single repo, local-only (no cloud DB, no deploy,
  no real SMS/email, no payments, no polished UI). Simple auth is fine.

**Two forward-looking hints that drive the architecture:**
- Enrollment ("our data, our rules") moves to a **separate system** next year.
- Messaging gets a **dedicated team** + SMS/email channels next year.

## Business rules (the core)

| Rule | Enforcement |
|------|-------------|
| A session is exactly one coach + one student; **no double-booking** | **DB partial unique index** (hard guarantee) |
| A coach's availability blocks never overlap | Domain `overlaps()` check at publish time, in a transaction |
| No student holds more than **3 upcoming** sessions | Domain rule over a counted query, in the booking transaction |
| Cancel allowed only up to **24h** before start; cancelling reopens the slot | Pure domain `canCancel(session, now)`; cancel flips status so the slot frees |
| A **suspended** student can view sessions but cannot book | `EnrollmentPort.canBook(studentId)` before insert; auth is unaffected |
| Availability blocks are **30 or 60 min** only | Value-object validation at construction |

**Honest trade-off:** only double-booking gets a database-level guarantee (the partial unique
index). Max-3 and overlap are check-then-act inside a transaction — correct under SQLite's
serialized writes, but on high-concurrency Postgres I'd back them with exclusion constraints /
explicit locking. Documented, not pretended away.

## Stack

- **Backend:** Express + Drizzle ORM + SQLite (local file; `:memory:` in tests), TypeScript strict.
- **Frontend:** React + Vite + React Query (server state) + minimal hand-written CSS.
- **Shared:** a `shared/` workspace for wire DTOs/enums and pure, unit-tested timezone helpers (Luxon).
- **Monorepo:** npm workspaces (`backend`, `frontend`, `shared`). Node 22 LTS (`.nvmrc`).
- **Tests:** Vitest (both ends) + supertest for API smoke.
- **Auth:** signed JWT carrying `{ userId, role }`, no passwords — login mints a token for a picked user.

## Architecture — modular monolith, three bounded contexts

One deployable app; three modules with hard internal boundaries so "extract later" is a file
move + a port swap, not a rewrite.

```
repo/
├── shared/                 # wire DTOs/enums + pure tz helpers (no logic beyond that)
├── backend/src/
│   ├── modules/
│   │   ├── identity/        # accounts + roles + login (the "simple auth")
│   │   ├── booking/         # CORE: coaches, availability, sessions, the rules
│   │   ├── enrollment/      # SUPPORTING (extraction candidate): student status
│   │   └── notifications/   # SUPPORTING (extraction candidate): in-app messages
│   ├── platform/            # cross-cutting: event bus, db client, http server, auth middleware, config
│   └── main.ts              # composition root — the ONLY file that wires all modules
└── frontend/src/            # features mirror backend modules
```

Each module is internally layered:
- `domain/` — entities, value objects, pure rule functions. **Depends on nothing.** No I/O.
- `application/` — use-cases (orchestrate domain + ports). Depends on `domain` + `ports`.
- `ports/` — interfaces the module owns (repositories, cross-module dependencies).
- `adapters/` — Drizzle repo impls, Express controllers. Implement `ports`.
- `index.ts` — the module's **public API**; nothing else is importable from outside.

**Two inviolable rules:**
1. Modules touch each other **only** through `ports/` + the event bus — never by importing
   another module's `domain/` or `adapters/`.
2. Dependencies point inward; the core booking rules never import Express, Drizzle, or another module.

## Identity & access — two separate concerns

- **Authentication (Identity module):** owns `users { id, displayName, role, timezone }`,
  `role ∈ {coach, student, enrollment_admin}`. Login = pick a user → signed JWT. Middleware in
  `platform/` verifies the token → `req.principal`. Role guards per route. Identity is the single
  account registry so the login picker has one place to list everyone.
- **Access status (Enrollment module):** owns the student `active | suspended` flag. A suspended
  student **still authenticates and still sees their sessions**; only `EnrollmentPort.canBook()`
  returns false, blocking new bookings. This split is exactly why "suspended can view but not book"
  falls out naturally.
- **Registration:** `enrollment_admin` registers a student → Enrollment calls
  `IdentityPort.createAccount({ displayName, role: student })`, then stores an active enrollment
  record. Coaches/admins are seeded directly in Identity. When Enrollment is extracted, that port
  call becomes an API call to Identity — same shape. Suspend/reactivate is students-only (not
  gold-plating coach/admin accounts).

## Data model

```
identity.users              id, display_name, role(coach|student|enrollment_admin), timezone(IANA), created_at
enrollment.enrollments      id, student_user_id → users.id (UNIQUE), status(active|suspended), created_at, updated_at
booking.availability_blocks id, coach_user_id, starts_at(UTC), ends_at(UTC), duration_min(30|60), created_at
booking.sessions            id, availability_block_id → blocks.id, student_user_id, coach_user_id,
                            starts_at(UTC), ends_at(UTC), status(confirmed|cancelled), created_at, cancelled_at
notifications.notifications id, recipient_user_id, type, payload(json), created_at, read_at
```

**No double-booking — enforced by the database, not the app:**
```sql
CREATE UNIQUE INDEX one_confirmed_session_per_block
  ON sessions (availability_block_id) WHERE status = 'confirmed';
```
A block has at most one *confirmed* session. Two same-millisecond requests → one INSERT wins, the
other hits the constraint → `SlotTaken`. The race is impossible by construction. Cancelling flips
`status → cancelled`, dropping the row out of the partial index, so the block is bookable again —
that is how "cancelled time opens up for others" works. "Open blocks for a week" = blocks with no
confirmed session, `starts_at` in the (UTC) range, in the future.

## Timezones — the server speaks only UTC

The domain and DB store/reason in absolute instants (UTC) only. Each user has a home IANA zone
(`users.timezone`). Conversion happens at exactly three **client** edges:

1. **Coach publishes (input):** coach's local wall time + their zone → UTC instant before sending.
2. **Any user views (display):** stored UTC instant → viewer's zone at render. One block renders as
   9:00 AM (Toronto), 6:00 AM (Vancouver), 3:00 PM (Paris).
3. **"Open times for a given week" (query):** the viewer's week is computed in their zone, its
   start/end converted to UTC bounds, sent as query params; the server filters by UTC range.

Because the 24h window, overlap, and "is it in the future" all operate on absolute instants, they
are correct regardless of who is looking. DST is handled by storing IANA zone **names** (not fixed
offsets) and converting via Luxon. The server uses the recipient's timezone only to render
notification text (e.g. "Your session on Mon Mar 2, 9:00 AM EST…"), proving tz-awareness runs
end to end. The tz helpers live in `shared/` as pure, unit-tested functions used by both ends.

## Module communication & extraction story

- **Synchronous reads → a query port.** Booking needs one fact from Enrollment while booking:
  `EnrollmentPort.canBook(studentUserId): Promise<boolean>`. Today an in-process adapter; after
  extraction, an HTTP adapter — Booking's code is unchanged because it only knows the interface.
  Same for `IdentityPort.createAccount(...)` used by Enrollment.
- **Reactions to events → domain events.** Booking emits `SessionBooked` / `SessionCancelled` to an
  in-process event bus; Notifications subscribes. Booking never knows Notifications exists, so the
  messaging team can add SMS/email subscribers with zero change to Booking.

**Booking use-case flow:**
```
POST /sessions (student)
  → auth middleware verifies JWT → principal {userId, role:student}
  → BookSession use-case:
       1. EnrollmentPort.canBook(studentId)          // suspended → 403 StudentSuspended
       2. domain: countUpcoming(studentId) < 3        // in txn → MaxUpcomingReached
       3. INSERT session (status=confirmed)            // partial unique index → SlotTaken on loser
       4. publish SessionBooked (after commit)
  → event bus → Notifications writes a "booked" message
```

Events fire **after DB commit** (never notify about a rolled-back booking). For the 4h in-memory
bus this is synchronous dispatch; a real extraction would add a durable outbox/queue here —
noted, not built. The composition root (`main.ts`) is the only file importing all modules and
wiring concrete adapters to interfaces. Extraction = move a module's folder to a new service +
flip two adapters from in-process to HTTP; nothing in `domain/`/`application/` changes.

## API surface

All timestamps are UTC ISO-8601 on the wire (client already converted). JWT in
`Authorization: Bearer`; role guards per route.

```
IDENTITY / AUTH
  GET    /users                         → login picker list (public)
  POST   /auth/login        {userId}    → { token }
  GET    /me                            → principal + profile (+ timezone)

BOOKING — coach
  POST   /availability-blocks  {startsAtUTC, durationMin}   role:coach  (overlap+duration checked)
  GET    /availability-blocks?coachId&fromUTC&toUTC
  DELETE /availability-blocks/:id                           role:coach  (withdraw OPEN block)

BOOKING — student
  GET    /coaches
  GET    /coaches/:id/open-blocks?fromUTC&toUTC
  POST   /sessions            {availabilityBlockId}         role:student
  POST   /sessions/:id/cancel                               role:student  (24h rule)
  GET    /sessions?scope=upcoming                           caller's own (student or coach)

ENROLLMENT                                                  role:enrollment_admin
  POST   /students   {displayName, timezone}                registers (account + active enrollment)
  GET    /students
  POST   /students/:id/suspend
  POST   /students/:id/reactivate

NOTIFICATIONS
  GET    /notifications                                     caller's messages
  POST   /notifications/:id/read                            (optional)
```

**Error model:** typed domain errors (`SlotTaken`, `StudentSuspended`, `MaxUpcomingReached`,
`CancelWindowPassed`, `BlockOverlap`) each carry a stable `code`; one error-mapper middleware turns
them into `409/403/422` + `{ code, message }`. The domain throws meaning; the edge decides status.

## Frontend structure

```
frontend/src/
├── app/            router, QueryClientProvider, AuthProvider (principal+token), role-based routes
├── shared/
│   ├── api/        fetch client (attaches JWT, parses typed errors)
│   ├── tz/         Luxon helpers: wallTime↔UTC, weekBoundsUTC(tz), formatInZone (unit-tested)
│   ├── types/      DTOs from the shared/ workspace package
│   └── ui/         minimal primitives (unstyled)
└── features/
    ├── auth/              user-picker login, useMe()
    ├── availability/      coach: publish form (local-tz → UTC), own blocks
    ├── booking/           student: coach list + weekly open-slots grid (UTC→viewer tz)
    ├── sessions/          upcoming list + cancel (disabled < 24h)
    ├── notifications/     message list + unread badge
    └── enrollment-admin/  student list, register, suspend/reactivate
```

Data flow: component → React Query hook → shared fetch client → REST. Mutations invalidate the
right queries (booking invalidates `open-blocks`, `my-sessions`, `notifications`). Server state in
React Query; UI state local. The role switcher logs in as a seeded coach/student/admin, flipping
which feature routes are reachable.

## Testing strategy

Organized to prove the rules, heaviest where risk is. Vitest + supertest + in-memory SQLite
(migrations applied per test).

1. **Domain unit tests (bulk):** `canCancel` boundaries (24h00/23h59/24h01); `overlaps` (edges,
   containment, adjacency); `countUpcoming` at 2/3/4; duration value object; **tz helpers** incl. a
   **DST boundary** case (Paris vs Toronto shift on different dates).
2. **Integration tests (use-case + SQLite):**
   - *Showcase:* two bookings on one block via `Promise.all` → exactly one confirmed, other `SlotTaken`.
   - suspended → `StudentSuspended`, no row.
   - 4th upcoming → `MaxUpcomingReached`.
   - cancel < 24h rejected; cancel ≥ 24h frees the block (re-book succeeds).
   - `SessionBooked`/`SessionCancelled` emitted → Notifications wrote the message.
3. **Contract test for `EnrollmentPort`:** booking tests use a fake; one test pins the real
   in-process adapter to the same contract.
4. **API smoke (light):** one supertest path — login → publish → book → cancel → see notification.

**Honest note:** better-sqlite3 is synchronous/serialized, so the concurrency test proves the
constraint rejects the loser, not true wall-clock parallelism — the guarantee is the index; the
test asserts the index holds. Frontend tests stay minimal (shared tz helpers + one slot-grid
renders-in-viewer-tz test), since UI polish is out of scope.

## Tooling & deliverables

**Three one-liners:**
```
npm install     # root — installs all workspaces
npm run dev      # migrates + seeds SQLite, then starts backend + frontend (concurrently)
npm test         # vitest across workspaces
```
Backend auto-migrates (drizzle-kit) and seeds on dev boot (also `npm run seed`). Dev DB is a
gitignored SQLite file.

**Seed data:** 3 coaches in Toronto / Vancouver / Paris; several students incl. ≥1 suspended;
availability blocks over the next two weeks; one pre-existing booking — enough to see
cross-timezone rendering and every rule immediately.

**README covers:** install/run/test (one command each); module structure and why; assumptions +
trade-offs + deliberate omissions; what's next with more time (event outbox/durable queue,
Postgres + exclusion constraints for the non-critical rules, real SMS/email channels, rescheduling,
pagination, real credentials); which AI tools were used and how; other tech choices (Express,
Drizzle, SQLite, Luxon, Vitest, Node 22). Commits stay unsquashed, one per milestone.

## Out of scope (explicitly)

Cloud DB, deployment, payments, real SMS/email, polished UI, real credential-based auth, rescheduling,
pagination, durable event delivery.
