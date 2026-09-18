# Epic 02: Estaciones y Dashboard

> After this epic: verification stations authenticate, scan a QR, and mark attendance with no
> possible double-count under concurrency; the admin has a live counter, a filterable table, a CSV
> export, applied styling/accessibility, and a CI pipeline that proves the production build works.

| | |
|---|---|
| **Epic id** | `02-estaciones-dashboard` |
| **Tasks** | `E2-T1` … `E2-T6` |
| **Depends on** | `01-foundation` |
| **Unlocks** | nothing — last epic |
| **Parallel with** | nothing — every task here has a real dependency on an earlier one in this epic or in `01-foundation` |

You do not need any other file to complete this epic. Everything below is repeated here on purpose.

---

## Stack

Next.js 16 (App Router) · TypeScript ~6.0.3 · Tailwind CSS 4 + shadcn/ui · Postgres (Neon) ·
Drizzle ORM 0.45.2 · `html5-qrcode` 2.3.8 · TanStack Query 5.101.4 (polling) · `@axe-core/playwright`
· Vercel. Package manager: `pnpm`. Runtime pinned in `.nvmrc`. Dependency versions are in
`pnpm-lock.yaml` — read it, never guess one.

| Task | Command |
|---|---|
| Dev | `pnpm dev` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Lint | `pnpm exec biome check .` |
| Test (one file) | `pnpm exec vitest run {path}` |
| E2E | `pnpm exec playwright test {path}` |
| Local test DB | `docker compose up -d test-db` / `docker compose down` |

**Gate:** `pnpm exec tsc --noEmit && pnpm exec biome check . && pnpm exec vitest run` passes before
any task here is marked done.

If any task below verifies against a real service, start it first: `docker compose up -d test-db`.
The file that defines it shipped in `workspace/` and is already at the project root — you do not
write it, and you never substitute a fake for the real Postgres instance the acceptance criteria
name. `E2-T5`'s Playwright suite additionally needs `pnpm build && pnpm start` — `playwright.config.ts`
under `workspace/` already declares this as its `webServer`, so `pnpm exec playwright test` starts
it for you.

## Directory subtree

Only the parts this epic touches:

```
src/
  server/
    stations.ts              # create/rotate/deactivate station codes — NEW
    verify.ts                 # the atomic anti-double-scan UPDATE — NEW
    export.ts                  # CSV row builder — NEW
  lib/
    station-session.ts          # signed station cookie, separate from admin auth — NEW
  app/
    (admin)/
      login/page.tsx              # admin login UI — NEW (wraps E1-T3's auth.ts)
      admin/
        page.tsx                    # dashboard: counter + table — NEW
        estaciones/
          page.tsx                    # station management UI — NEW
          actions.ts                   # server actions — NEW
    api/
      admin/stats/route.ts             # polled by TanStack Query — NEW
      admin/export/route.ts             # CSV download — NEW
      verify/route.ts                    # scan endpoint — NEW
      health/route.ts                     # deploy-readiness check — NEW
    verificar/
      login/page.tsx                       # station code entry — NEW
      page.tsx                              # camera scan UI — NEW
  components/
    qr-scanner.tsx                           # html5-qrcode wrapper, client component — NEW
    attendance-table.tsx                      # filterable table — NEW
    status-badge.tsx                           # color+icon+text badge — NEW
  app/globals.css                              # @theme tokens — edited
tests/
  server/stations.test.ts
  server/verify-concurrency.test.ts
  server/stats.test.ts
  server/export.test.ts
  server/health.test.ts
  e2e/accessibility.spec.ts
.github/workflows/ci.yml
```

Everything outside this subtree is out of scope. If a task seems to require editing a file not
listed here, stop and report — it means the epic boundary is wrong.

## Data model touched here

| Entity | Fields this epic adds or reads | Notes |
|---|---|---|
| `verification_station` | all — first written here | `code_hash` only, never plaintext |
| `ticket` | `status`, `verified_at`, `verified_by_station` — written by `src/server/verify.ts` only | The atomic conditional `UPDATE` — see `.claude/rules/verification.md` |

## Contracts

**Consumed** — already exists from `01-foundation`, do not rebuild:

| From | Interface | Guarantee |
|---|---|---|
| `E1-T1` | `src/db/client.ts` → `db` | typed Drizzle client over Postgres |
| `E1-T3` | `src/lib/auth.ts` → `auth.api.getSession(...)` | resolves the current admin session or `null` |
| `E1-T5` | `src/lib/qr-token.ts` → `verifyQrToken(token)` | `{valid:false} \| {valid:true, ticketId}` |
| `E1-T4`/`E1-T5` | `src/server/tickets.ts` → `createOrGetTicket` | never produces a duplicate ticket |

**Produced** — nothing downstream in this build; this is the last epic.

## Conventions that bite in this area

- `src/server/verify.ts` never reads `ticket.status` before writing it — see
  `.claude/rules/verification.md`. Every test in `tests/server/verify-concurrency.test.ts` exists to
  catch a regression of exactly this rule.
- `html5-qrcode` requires camera permission and only runs client-side — `qr-scanner.tsx` is a
  `"use client"` leaf, never the page itself.
- Station sessions and admin sessions are two different cookies (`src/lib/station-session.ts` vs
  `src/lib/auth.ts`) — a station code is not an account and must never be able to reach `/admin/*`.

Full project rules: `CLAUDE.md`. Area rules: `.claude/rules/verification.md`,
`.claude/rules/styling.md`. Both sit in the project root — the builder copied them there from the
bundle's `workspace/` before task one.

---

## Tasks

Listed in the same order as `tasks.json`. That order is the build order — work top to bottom and do
not re-rank by priority or by what looks quick.

### `E2-T1` — Gestión de estaciones de verificación + sesión de estación

**Depends on:** `E1-T3` · **Priority:** p0

`src/server/stations.ts` hashes station codes (same hashing primitive Better Auth already pulls in
for passwords — reuse it, do not add a second hashing library) and exposes `createStation`,
`rotateStationCode`, `deactivateStation`, `verifyStationCode`. The admin UI at `/admin/estaciones`
lists stations and lets the admin create/rotate/deactivate. `/verificar/login` is the station-facing
form: submits a code, and on success `src/lib/station-session.ts` sets a signed cookie distinct from
the admin auth cookie.

**Files**
- `src/server/stations.ts` — new
- `src/lib/station-session.ts` — new
- `src/app/(admin)/admin/estaciones/page.tsx` — new
- `src/app/(admin)/admin/estaciones/actions.ts` — new
- `src/app/verificar/login/page.tsx` — new

**Acceptance**

1. **WHEN** an admin creates a station **THE SYSTEM SHALL** store only a hash of its code, never the plaintext, in `verification_station.code_hash`.
2. **WHEN** an admin rotates a station's code **THE SYSTEM SHALL** make the old code's hash no longer match on the next verification attempt.
3. **WHEN** a valid, active station code is submitted at `/verificar/login` **THE SYSTEM SHALL** set a signed station-session cookie and redirect to `/verificar`.
4. **WHEN** an invalid station code is submitted **THE SYSTEM SHALL** reject it and set no cookie.
5. **WHEN** a station is deactivated (`active=false`) **THE SYSTEM SHALL** reject that station's code even if it is otherwise correct.
6. **WHEN** `pnpm exec vitest run tests/server/stations.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/server/stations.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T1: station management + station sessions"
git tag step-08-stations
```

### `E2-T2` — Verificación por cámara con UPDATE atómico anti-doble-uso

**Depends on:** `E1-T5`, `E2-T1` · **Priority:** p0

`src/server/verify.ts` verifies the HMAC signature first (no DB touch on a bad signature), then runs
exactly one `UPDATE ticket SET status='verified', verified_at=now(), verified_by_station=$1 WHERE
id=$2 AND status='issued'` inside a transaction and reads the row count to decide the outcome — see
`.claude/rules/verification.md`, this is non-negotiable. `/verificar` is the scanning page:
`qr-scanner.tsx` wraps `html5-qrcode`, decodes a QR, and POSTs the raw token to `/api/verify`,
flashing green (new) or amber (already verified, showing who/when) — never color alone.

**Files**
- `src/server/verify.ts` — new
- `src/app/api/verify/route.ts` — new
- `src/app/verificar/page.tsx` — new
- `src/components/qr-scanner.tsx` — new
- `tests/server/verify-concurrency.test.ts` — new

**Acceptance**

1. **WHEN** a valid, unverified ticket's QR token is submitted to `/api/verify` **THE SYSTEM SHALL** set `status='verified'`, record `verified_at` and `verified_by_station`, and return `{ ok:true, data:{ alreadyVerified:false } }`.
2. **WHEN** the same ticket is submitted a second time **THE SYSTEM SHALL** return `{ ok:true, data:{ alreadyVerified:true, verifiedAt, stationLabel } }` and SHALL NOT change the stored `verified_at`.
3. **WHEN** a token with an invalid HMAC signature is submitted **THE SYSTEM SHALL** reject with `{ ok:false, error:{code:'INVALID_SIGNATURE'} }` before any database write.
4. **WHEN** 10 concurrent verification requests are issued for the SAME ticket id **THE SYSTEM SHALL** mark it verified exactly once — exactly 1 of the 10 responses has `alreadyVerified:false` and 9 have `alreadyVerified:true`.
5. **WHEN** `pnpm exec vitest run tests/server/verify-concurrency.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/server/verify-concurrency.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T2: camera verification + atomic anti-double-scan update"
git tag step-09-verify-concurrency
```

### `E2-T3` — Dashboard admin: contador en vivo + tabla filtrable + login UI

**Depends on:** `E1-T3`, `E1-T2`, `E2-T2` · **Priority:** p0

`/login` (admin-facing UI, wraps `E1-T3`'s `auth.ts`). `/admin` polls `/api/admin/stats` every ~5s
via TanStack Query and shows `verificados / total` in tabular numerals, plus
`attendance-table.tsx` — one row per `personnel` record, filterable by status, each row's badge
using `status-badge.tsx` (built fully in `E2-T5`; a minimal version is fine here).

**Files**
- `src/app/(admin)/login/page.tsx` — new
- `src/app/(admin)/admin/page.tsx` — new
- `src/app/api/admin/stats/route.ts` — new
- `src/components/attendance-table.tsx` — new
- `tests/server/stats.test.ts` — new

**Acceptance**

1. **WHEN** `/api/admin/stats` is called by an authenticated admin **THE SYSTEM SHALL** return `{ ok:true, data:{ verified:number, total:number } }` matching the real `ticket` and `personnel` counts.
2. **WHEN** an unauthenticated request hits `/api/admin/stats` **THE SYSTEM SHALL** respond 401 and return no counts.
3. **WHEN** a ticket's status changes to `verified` between two calls **THE SYSTEM SHALL** reflect the new count on the next call to `/api/admin/stats`.
4. **WHEN** `pnpm exec vitest run tests/server/stats.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/server/stats.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T3: live dashboard counter + filterable table + login UI"
git tag step-10-dashboard
```

### `E2-T4` — Export CSV de la lista de asistencia final

**Depends on:** `E2-T3` · **Priority:** p1

`src/server/export.ts` builds the CSV in memory (this event is under 250 people — no streaming
needed) from a join of `personnel` and `ticket`. `/api/admin/export` streams it back with a
`Content-Disposition: attachment` header.

**Files**
- `src/app/api/admin/export/route.ts` — new
- `src/server/export.ts` — new
- `tests/server/export.test.ts` — new

**Acceptance**

1. **WHEN** an authenticated admin requests `/api/admin/export` **THE SYSTEM SHALL** return a CSV with one row per `personnel` record including grado, apellidos, nombres, cip, pagado, status, verified_at.
2. **WHEN** an unauthenticated request hits `/api/admin/export` **THE SYSTEM SHALL** respond 401.
3. **WHEN** `pnpm exec vitest run tests/server/export.test.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/server/export.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T4: final attendance CSV export"
git tag step-11-export
```

### `E2-T5` — Sistema de diseño aplicado + responsive + accesibilidad

**Depends on:** `E2-T3`, `E1-T7`, `E2-T2` · **Priority:** p1

Apply the `@theme` tokens from `blueprint.md` §7/`CLAUDE.md` to `src/app/globals.css`. Build the
real `status-badge.tsx` (icon + text + color, per `.claude/rules/styling.md`). Add
`@axe-core/playwright` and write `tests/e2e/accessibility.spec.ts` scanning `/registro`,
`/mi-ticket`, and `/verificar`. Confirm no horizontal scroll at 375px on `/registro`.

**Files**
- `src/app/globals.css` — edit
- `src/components/status-badge.tsx` — new
- `package.json` — edit: add `@axe-core/playwright`
- `tests/e2e/accessibility.spec.ts` — new

**Acceptance**

1. **WHEN** the axe scan runs against `/registro`, `/mi-ticket`, and `/verificar` **THE SYSTEM SHALL** report 0 violations.
2. **WHEN** the viewport is 375px wide **THE SYSTEM SHALL** show no horizontal scroll on `/registro`.
3. **WHEN** a status badge renders **THE SYSTEM SHALL** include both a text label and an icon element, never color alone.
4. **WHEN** `pnpm exec playwright test tests/e2e/accessibility.spec.ts` runs **THE SYSTEM SHALL** report 0 failed.

**Verify**

```bash
pnpm exec playwright test tests/e2e/accessibility.spec.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T5: design system, responsive, accessibility"
git tag step-12-design-a11y
```

### `E2-T6` — CI pipeline y verificación de build de producción

**Depends on:** `E2-T5` · **Priority:** p0

`.github/workflows/ci.yml` runs install → typecheck → lint → unit tests → build on every push.
`/api/health` checks a real `SELECT 1` against the database before reporting ok — proving the
production build can actually reach Postgres, not just that it compiled. Live deployment to Vercel
and the real Neon project happens after this build (see `blueprint.md`'s post-build launch
checklist) — it needs the user's own accounts and is not a task an unattended build can gate on.

**Files**
- `.github/workflows/ci.yml` — new
- `src/app/api/health/route.ts` — new
- `tests/server/health.test.ts` — new

**Acceptance**

1. **WHEN** `.github/workflows/ci.yml` runs on a push **THE SYSTEM SHALL** execute install, typecheck, lint, unit tests and build, failing the job if any step exits non-zero.
2. **WHEN** `pnpm build` runs **THE SYSTEM SHALL** exit 0 and produce a `.next` production build with zero type errors.
3. **WHEN** the built app is started with `pnpm start` and `GET /` is requested **THE SYSTEM SHALL** return HTTP 200.
4. **WHEN** `GET /api/health` is requested against the running build **THE SYSTEM SHALL** return HTTP 200 with `{ ok:true, data:{ db:'ok' } }` after checking a real database connection.

**Verify**

```bash
pnpm build
pnpm exec vitest run tests/server/health.test.ts
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T6: CI pipeline + production build health check"
git tag step-13-ci-deploy-readiness
```

---

## Epic acceptance

The epic is done when every task is `done` **and**:

1. **WHEN** a station operator logs in at `/verificar/login` and scans a valid ticket QR at `/verificar` **THE SYSTEM SHALL** mark it verified and the admin dashboard's counter SHALL reflect it on its next poll.
2. **WHEN** two stations scan the same physical QR within milliseconds of each other (simulated by 10 concurrent requests) **THE SYSTEM SHALL** accept exactly one and reject the rest as already-verified.

```bash
pnpm exec tsc --noEmit && pnpm exec biome check . && pnpm exec vitest run
pnpm exec playwright test tests/e2e/accessibility.spec.ts
```

Run from the project root. Both criteria are decidable by `tests/server/verify-concurrency.test.ts`
and `tests/server/stats.test.ts`, already authored by `E2-T2` and `E2-T3` — no human check needed.

## Pitfalls

- **Adding a `SELECT` before the conditional `UPDATE` in `verify.ts`** — this reintroduces the race
  the whole task exists to close. If you think you need to read first to give a nicer error
  message, read the row the `UPDATE` did *not* affect, after the fact, only on the losing branch.
- **Letting a station session reach `/admin/*`, or an admin session reach `/api/verify` without a
  station cookie.** They are deliberately separate — a station code is not an account.
- **Running the axe scan against a page still using the scaffold's default styling.** Do `E2-T3`'s
  functional work first, tokens second — auditing a half-styled page wastes the scan.

## Before moving on

- [ ] Every task in this epic is `done` in `tasks.json` — no task left `in_progress`.
- [ ] Every `verify` command of every task in this epic passed, not just the first one.
- [ ] No `verify` command was edited, and none was skipped because a file it names did not exist.
- [ ] **Every task in this epic has its `checkpoint` tag in version control** — `git tag -l 'step-*'` lists `step-08-stations` through `step-13-ci-deploy-readiness`.
- [ ] Gate command passes clean, run from the project root.
- [ ] No file outside the subtree was modified.
- [ ] `.env.example` updated if this epic added a variable — it did not; all vars were already in the shipped `.env.example`.
- [ ] One commit per task, each prefixed with its task id, each followed by its checkpoint tag.
