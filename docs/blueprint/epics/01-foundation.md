# Epic 01: Foundation

> After this epic: the schema, DB client, admin auth, and the full registration → QR → download →
> re-lookup flow exist and are tested — everything a person needs to get their own ticket.

| | |
|---|---|
| **Epic id** | `01-foundation` |
| **Tasks** | `E1-T1` … `E1-T7` |
| **Depends on** | nothing — start here |
| **Unlocks** | `02-estaciones-dashboard` |
| **Parallel with** | nothing at first; `E1-T2`, `E1-T3`, `E1-T4` can run in parallel once `E1-T1` is done (no shared files) |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Next.js 16 (App Router) · TypeScript ~6.0.3 · Tailwind CSS 4 + shadcn/ui · Postgres (Neon) ·
Drizzle ORM 0.45.2 · Better Auth 1.6.25 · `qrcode` 1.5.4 · `html-to-image` 1.11.13 · Vercel.
Package manager: `pnpm`. Runtime pinned in `.nvmrc` (Node 24). Dependency versions are in
`pnpm-lock.yaml` — read it, never guess one.

| Task | Command |
|---|---|
| Dev | `pnpm dev` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Lint | `pnpm exec biome check .` |
| Test (one file) | `pnpm exec vitest run {path}` |
| Migrate | `pnpm exec drizzle-kit generate && pnpm exec drizzle-kit migrate` |
| Local test DB | `docker compose up -d test-db` / `docker compose down` |

**Gate:** `pnpm exec tsc --noEmit && pnpm exec biome check . && pnpm exec vitest run` passes before
any task here is marked done.

If any task below verifies against a real service, start it first: `docker compose up -d test-db`.
The file that defines it (`docker-compose.yml`) shipped in `workspace/` and is already at the
project root — you do not write it, and you never substitute a fake for the real Postgres instance
the acceptance criteria name.

## Directory subtree

Only the parts this epic touches:

```
src/
  db/
    schema.ts           # personnel, ticket, verification_station, ticket_download_log — NEW
    client.ts            # exported `db` Drizzle client over Postgres — NEW
  lib/
    env.ts                # zod-validated process.env — NEW
    schemas.ts             # shared zod schemas (CSV row, registro form) — NEW, edited across tasks
    import-personnel.ts    # CSV parsing + validation logic — NEW
    auth.ts                 # Better Auth server instance — NEW
    qr-token.ts              # HMAC sign/verify — NEW
    qr-image.ts               # PNG generation via `qrcode` — NEW
  server/
    tickets.ts                 # the ONLY writer of the `ticket` table — NEW
    ticket-downloads.ts          # download counter + log — NEW
    rate-limit.ts                 # CIP search rate limiting — NEW
  app/
    api/auth/[...all]/route.ts     # Better Auth catch-all handler — NEW
    registro/page.tsx               # registration form — NEW
    registro/actions.ts              # server action — NEW
    ticket/[id]/page.tsx              # QR display — NEW
    mi-ticket/page.tsx                 # re-lookup form — NEW
    mi-ticket/actions.ts                # server action — NEW
    api/tickets/[id]/download/route.ts   # download + log — NEW
  components/
    ticket-card.tsx                       # QR card with download button — NEW
  proxy.ts                                  # route protection for /admin — NEW
scripts/
  import-personnel.ts       # CLI wrapper around src/lib/import-personnel.ts — NEW
  seed-admin.ts               # one-time admin account creation — NEW
tests/
  db/client.test.ts
  lib/import-personnel.test.ts
  lib/auth.test.ts
  lib/qr-token.test.ts
  server/tickets.test.ts
  server/ticket-downloads.test.ts
  server/rate-limit.test.ts
```

Everything outside this subtree is out of scope. If a task seems to require editing a file not
listed here, stop and report — it means the epic boundary is wrong.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `personnel` | all — created here | Uniqueness on `cip` and `dni` enforced at the DB |
| `ticket` | all except `verified_by_station` (written in epic 02) | `personnel_id` is `unique` |
| `ticket_download_log` | all | Append-only, never updated or deleted |
| `verification_station` | not written here | Table exists (from `E1-T1`'s schema), populated in `02-estaciones-dashboard` |

## Contracts

**Produced** — later epics and the E2 tasks depend on exactly these signatures:

| Export | Signature | Used by |
|---|---|---|
| `src/db/client.ts` → `db` | Drizzle `NodePgDatabase`-shaped client | `E2-T1`, `E2-T2`, `E2-T3`, `E2-T4` |
| `src/lib/auth.ts` → `auth` | Better Auth server instance, `auth.api.getSession(...)` | `E2-T1`, `E2-T3` (route protection) |
| `src/lib/qr-token.ts` → `signQrToken(ticketId)`, `verifyQrToken(token)` | `verifyQrToken` returns `{valid:false} \| {valid:true, ticketId:string}` | `E2-T2` |
| `src/server/tickets.ts` → `createOrGetTicket(personnelId)` | returns the existing or new `ticket` row — never a duplicate | `E2-T2`, `E2-T3` |

## Conventions that bite in this area

- `.ts` relative specifiers everywhere, never `.js` — `tsconfig.json` carries
  `allowImportingTsExtensions` + `rewriteRelativeImportExtensions`, and this applies identically
  to app source, `tests/**`, and the standalone `scripts/**` run with `tsx`.
- `src/lib/env.ts` is the only place `process.env` is read for the app. Standalone scripts
  (`scripts/import-personnel.ts`, `scripts/seed-admin.ts`) load `.env` explicitly via
  `import "dotenv/config"` at the top — they are not booted by the Next.js framework, so nothing
  loads it for them.
- `src/server/tickets.ts` is the only writer of the `ticket` table, from `E1-T4` onward — see
  `.claude/rules/verification.md` for why this matters even more once epic 02 adds verification.

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/database.md`. Both sit in the project
root — the builder copied them there from the bundle's `workspace/` before task one.

---

## Tasks

Listed in the same order as `tasks.json`. That order is the build order — work top to bottom and do
not re-rank by priority or by what looks quick.

### `E1-T1` — Scaffold Next.js + Drizzle schema + repo init

**Depends on:** nothing · **Priority:** p0

Run the track's scaffold command (`pnpm create next-app@latest . --ts --app --tailwind --biome
--src-dir --use-pnpm`, already executed once by `blueprint.md` §10's Bootstrap — this task is about
the schema and DB client that come after it). Define all four tables in `src/db/schema.ts` exactly
as in `blueprint.md` §4. Write `src/db/client.ts` exporting a single `db` instance built from
`@neondatabase/serverless` + `drizzle-orm/neon-http`, and `src/lib/env.ts` validating
`DATABASE_URL`/`TEST_DATABASE_URL` with `zod` at import time, throwing a named error if either is
missing. Generate and apply the first migration against `TEST_DATABASE_URL`.

**Files**
- `package.json` — edit: dependencies added on top of the scaffold (see `blueprint.md` §10)
- `src/db/schema.ts` — new
- `src/db/client.ts` — new
- `src/lib/env.ts` — new
- `tests/db/client.test.ts` — new

**Acceptance**

1. **WHEN** `pnpm install --frozen-lockfile` runs **THE SYSTEM SHALL** exit 0 without modifying the lockfile.
2. **WHEN** `pnpm exec tsc --noEmit` runs **THE SYSTEM SHALL** exit 0 with `strict` true in `tsconfig.json`.
3. **WHEN** `pnpm exec drizzle-kit migrate` runs against `TEST_DATABASE_URL` on an empty database **THE SYSTEM SHALL** create the `personnel`, `ticket`, `verification_station`, and `ticket_download_log` tables.
4. **WHEN** a query is issued through the exported `db` client in `src/db/client.ts` **THE SYSTEM SHALL** return typed rows with no `any`.
5. **WHEN** `DATABASE_URL` is absent at import time **THE SYSTEM SHALL** throw a named error from `src/lib/env.ts` rather than failing at the first query.
6. **WHEN** `pnpm exec vitest run tests/db/client.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
pnpm exec vitest run tests/db/client.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: scaffold + drizzle schema + repo init"
git tag step-01-scaffold
```

### `E1-T2` — Import CSV de personal con validación estricta

**Depends on:** `E1-T1` · **Priority:** p0

Parse the admin-supplied CSV/Excel with a streaming CSV parser, validate every row against a `zod`
schema in `src/lib/schemas.ts` (all fields required, `cip` and `dni` each unique **within the
file**), then replace `personnel`'s contents inside one transaction — delete-then-insert, never a
partial write. Collect every rejected row with its row number and reason instead of failing on the
first bad row, so the admin gets one complete error report.

**Files**
- `src/lib/import-personnel.ts` — new
- `scripts/import-personnel.ts` — new
- `src/lib/schemas.ts` — new
- `tests/lib/import-personnel.test.ts` — new

**Acceptance**

1. **WHEN** a CSV row is missing a required field **THE SYSTEM SHALL** reject the whole import and report the row number and field name.
2. **WHEN** two rows share the same `cip` **THE SYSTEM SHALL** reject the import and report both row numbers.
3. **WHEN** two rows share the same `dni` **THE SYSTEM SHALL** reject the import and report both row numbers.
4. **WHEN** a CSV validates cleanly **THE SYSTEM SHALL** replace the `personnel` table contents inside one transaction — either every row lands or none does.
5. **WHEN** `pnpm exec tsx scripts/import-personnel.ts --file {path}` is invoked with a valid file **THE SYSTEM SHALL** exit 0 and print the row count imported.
6. **WHEN** `pnpm exec vitest run tests/lib/import-personnel.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/lib/import-personnel.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T2: CSV import with strict validation"
git tag step-02-import-personnel
```

### `E1-T3` — Auth admin con Better Auth + protección de rutas

**Depends on:** `E1-T1` · **Priority:** p0

Configure `better-auth` (email/password only, no social providers) in `src/lib/auth.ts`, wire the
catch-all route handler, and write `src/proxy.ts` (NOT `middleware.ts` — renamed in Next.js 16) to
redirect unauthenticated `/admin/*` requests to `/login`. `scripts/seed-admin.ts` creates exactly
one admin account from `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`, idempotently. The login **page**
is built later, in `E2-T3`, alongside the dashboard shell — this task proves the auth logic itself
through `auth.api` calls, with no UI dependency.

**Files**
- `src/lib/auth.ts` — new
- `src/app/api/auth/[...all]/route.ts` — new
- `src/proxy.ts` — new
- `scripts/seed-admin.ts` — new
- `tests/lib/auth.test.ts` — new

**Acceptance**

1. **WHEN** `src/proxy.ts`'s exported `config.matcher` is inspected **THE SYSTEM SHALL** include a pattern that matches `/admin/dashboard`.
2. **WHEN** the seed logic is invoked twice with the same `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` **THE SYSTEM SHALL** leave exactly one matching admin user (idempotent).
3. **WHEN** `auth.api.signInEmail` is called with valid seeded credentials **THE SYSTEM SHALL** return a non-null session.
4. **WHEN** `auth.api.signInEmail` is called with an invalid password **THE SYSTEM SHALL** reject and create no session.
5. **WHEN** `pnpm exec vitest run tests/lib/auth.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/lib/auth.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T3: admin auth with Better Auth + route protection"
git tag step-03-admin-auth
```

### `E1-T4` — Flujo de registro: búsqueda, validación CIP/DNI, ticket idempotente

**Depends on:** `E1-T1` · **Priority:** p0

`src/server/tickets.ts` exports `createOrGetTicket(personnelId)`: looks up an existing `ticket` for
that `personnel_id` first; if none exists, inserts one inside a transaction guarded by the table's
`unique` constraint on `personnel_id`, so a race between two tabs for the same person still yields
one row (catch the unique-violation and re-select). The registration form (`/registro`) looks the
person up by name (client-side filter over a small server-loaded list — this event is under 250
people), then posts `cip`, `dni`, and the consent checkbox to a server action that validates both
against the matched `personnel` row before calling `createOrGetTicket`.

**Files**
- `src/server/tickets.ts` — new
- `src/app/registro/page.tsx` — new
- `src/app/registro/actions.ts` — new
- `src/lib/schemas.ts` — edit: add the registro request schema
- `tests/server/tickets.test.ts` — new

**Acceptance**

1. **WHEN** a valid `cip`+`dni` matching a `personnel` row is submitted with the consent checkbox checked **THE SYSTEM SHALL** create exactly one `ticket` row for that `personnel_id`.
2. **WHEN** the same `personnel_id` submits again **THE SYSTEM SHALL** return the existing ticket instead of creating a second row — the `ticket` count for that person stays 1.
3. **WHEN** `cip` matches a record but `dni` does not **THE SYSTEM SHALL** reject with `{ ok:false, error:{code:'INVALID_CREDENTIALS'} }` and create no ticket.
4. **WHEN** the consent checkbox is not checked **THE SYSTEM SHALL** reject with `{ ok:false, error:{code:'CONSENT_REQUIRED'} }`.
5. **WHEN** `pnpm exec vitest run tests/server/tickets.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/server/tickets.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: registration flow with idempotent ticket creation"
git tag step-04-registro
```

### `E1-T5` — Generación de QR con token HMAC firmado + pantalla de ticket

**Depends on:** `E1-T4` · **Priority:** p0

`src/lib/qr-token.ts` exports `signQrToken(ticketId)` (HMAC-SHA256 over the ticket id with
`QR_HMAC_SECRET`, base64url payload + signature) and `verifyQrToken(token)`. `createOrGetTicket`
(edited here) signs the token at creation and stores it in `ticket.qr_token`. `src/lib/qr-image.ts`
renders it to a PNG data URL with the `qrcode` package, server-side. `/ticket/[id]` displays the
card: QR image, name, CIP, and the legal notice ("personal e intransferible, sujeto a sanción").

**Files**
- `src/lib/qr-token.ts` — new
- `src/lib/qr-image.ts` — new
- `src/app/ticket/[id]/page.tsx` — new
- `src/server/tickets.ts` — edit: sign and store `qr_token` on creation
- `tests/lib/qr-token.test.ts` — new

**Acceptance**

1. **WHEN** a ticket is created **THE SYSTEM SHALL** store a `qr_token` that is a valid HMAC-SHA256 signed payload encoding the ticket id.
2. **WHEN** `verifyQrToken` is called with a tampered payload (one character altered) **THE SYSTEM SHALL** return `{ valid:false }`.
3. **WHEN** `verifyQrToken` is called with the exact stored token **THE SYSTEM SHALL** return `{ valid:true, ticketId }` matching the ticket.
4. **WHEN** `/ticket/[id]` is requested for an existing ticket **THE SYSTEM SHALL** render a PNG QR image generated server-side from the stored token.
5. **WHEN** `pnpm exec vitest run tests/lib/qr-token.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/lib/qr-token.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T5: HMAC-signed QR token + ticket screen"
git tag step-05-qr-token
```

### `E1-T6` — Descarga del ticket como imagen + log de descargas

**Depends on:** `E1-T5` · **Priority:** p1

`src/components/ticket-card.tsx` (client component) uses `html-to-image`'s `toPng` to capture the
whole card — QR, name, CIP, legal notice — and trigger a browser download, then POSTs to
`/api/tickets/[id]/download` to record it. `src/server/ticket-downloads.ts` increments
`ticket.download_count` and inserts one `ticket_download_log` row with the request's IP, in one
transaction.

**Files**
- `src/components/ticket-card.tsx` — new
- `src/app/api/tickets/[id]/download/route.ts` — new
- `src/server/ticket-downloads.ts` — new
- `tests/server/ticket-downloads.test.ts` — new

**Acceptance**

1. **WHEN** the download endpoint is called for an existing ticket **THE SYSTEM SHALL** increment `download_count` by 1 and insert one `ticket_download_log` row with the caller's IP.
2. **WHEN** the download endpoint is called 3 times for the same ticket **THE SYSTEM SHALL** leave `download_count` at 3 and `ticket_download_log` with 3 rows for it.
3. **WHEN** the endpoint is called for a nonexistent ticket id **THE SYSTEM SHALL** respond 404 and write no row.
4. **WHEN** `pnpm exec vitest run tests/server/ticket-downloads.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/server/ticket-downloads.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T6: download as image + download log"
git tag step-06-download-log
```

### `E1-T7` — Buscar mi ticket (CIP+DNI) con rate limiting

**Depends on:** `E1-T4` · **Priority:** p1

`src/server/rate-limit.ts` tracks lookup attempts in a `ticket_search_attempt` table (part of
`E1-T1`'s schema) keyed by `cip`, counting failures in the trailing hour. `/mi-ticket` re-runs the
same CIP+DNI validation as registration; on success it redirects to `/ticket/[id]` (reusing
`E1-T5`'s page) instead of creating anything new.

**Files**
- `src/server/rate-limit.ts` — new
- `src/app/mi-ticket/page.tsx` — new
- `src/app/mi-ticket/actions.ts` — new
- `tests/server/rate-limit.test.ts` — new

**Acceptance**

1. **WHEN** a `cip`+`dni` lookup matches an issued ticket **THE SYSTEM SHALL** return that ticket's id.
2. **WHEN** 5 failed lookups for the same `cip` occur within one hour **THE SYSTEM SHALL** reject the 6th attempt with `{ ok:false, error:{code:'RATE_LIMITED'} }` regardless of whether the credentials are correct.
3. **WHEN** a failed lookup is older than one hour **THE SYSTEM SHALL** NOT count toward the rate limit.
4. **WHEN** `pnpm exec vitest run tests/server/rate-limit.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/server/rate-limit.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T7: mi-ticket lookup with rate limiting"
git tag step-07-mi-ticket
```

---

## Epic acceptance

The epic is done when every task is `done` **and**:

1. **WHEN** a person completes `/registro` with valid CIP+DNI **THE SYSTEM SHALL** produce a ticket they can view at `/ticket/[id]`, download as an image, and find again later via `/mi-ticket`.
2. **WHEN** the CSV import is re-run with a corrected file after a rejected attempt **THE SYSTEM SHALL** succeed and leave `personnel` in the new, valid state.

```bash
pnpm exec tsc --noEmit && pnpm exec biome check . && pnpm exec vitest run
```

Run from the project root. Both criteria are decidable by the vitest suites each task already
authored — no human check needed here.

## Pitfalls

- **Reading `process.env` directly outside `src/lib/env.ts`.** It compiles, then breaks the moment
  a var is renamed. Always import the validated object.
- **Writing to `ticket.status` from `E1-T7`'s lookup path.** Looking a ticket up is read-only —
  epic 02 is the only place that ever flips `status`.
- **Forgetting `dotenv/config` in `scripts/import-personnel.ts` and `scripts/seed-admin.ts`.**
  Both run outside the Next.js framework via `tsx`; nothing loads `.env` for them automatically.

## Before moving on

- [ ] Every task in this epic is `done` in `tasks.json` — no task left `in_progress`.
- [ ] Every `verify` command of every task in this epic passed, not just the first one.
- [ ] No `verify` command was edited, and none was skipped because a file it names did not exist.
- [ ] **Every task in this epic has its `checkpoint` tag in version control** — `git tag -l 'step-*'` lists `step-01-scaffold` through `step-07-mi-ticket`.
- [ ] Gate command passes clean, run from the project root.
- [ ] Every "Produced" contract above exists with the stated signature.
- [ ] No file outside the subtree was modified.
- [ ] `.env.example` updated if this epic added a variable — it did not; all vars were already in the shipped `.env.example`.
- [ ] One commit per task, each prefixed with its task id, each followed by its checkpoint tag.
