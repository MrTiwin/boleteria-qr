# boleteria-qr

Sistema de boletería QR para el almuerzo de camaradería institucional: el personal se registra,
recibe un ticket QR intransferible, y 6-8 estaciones lo escanean el día del evento para marcar
asistencia sin permitir doble uso.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` — http://localhost:3000 |
| Build | `pnpm build` |
| Start (built) | `pnpm start` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Lint / format | `pnpm exec biome check .` · `pnpm exec biome check --write .` |
| Unit tests | `pnpm exec vitest run` · one file: `pnpm exec vitest run {path/to/file}` |
| E2E | `pnpm exec playwright test` |
| Local test DB up/down | `docker compose up -d test-db` · `docker compose down` |
| DB generate migration | `pnpm exec drizzle-kit generate` |
| DB apply migration | `pnpm exec drizzle-kit migrate` |
| DB inspect | `pnpm exec drizzle-kit studio` |
| Seed admin user | `pnpm exec tsx scripts/seed-admin.ts` |

**Gate:** `pnpm exec biome check . && pnpm exec tsc --noEmit && pnpm exec vitest run && pnpm build`
must pass before any task is marked done.

Runtime pinned in `.nvmrc` (Node 24) and `packageManager` in `package.json` (pnpm 11.17.0).
Dependency versions live in `pnpm-lock.yaml` — read it, never guess one.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 + shadcn/ui · Postgres (Neon) · Drizzle ORM ·
Better Auth (admin) · custom station-code auth · `qrcode` + `html5-qrcode` · TanStack Query polling ·
Vercel.

## Architecture

**Request path — registration.** Browser → `src/app/registro/page.tsx` (server, reads personnel
list) → `src/app/registro/actions.ts` (server action: validates CIP+DNI with zod, calls
`src/server/tickets.ts`) → `src/db/client.ts` → Postgres. `src/server/tickets.ts` is the **only**
place a `ticket` row is created or transitioned — nothing else writes that table.

**Request path — verification.** Station scans a QR in the browser camera
(`html5-qrcode`, client component) → POSTs the decoded token to
`src/app/api/verify/route.ts` → `src/server/verify.ts` validates the HMAC signature, then runs a
single `UPDATE ticket SET status='verified' ... WHERE id=$1 AND status='issued'` inside a
transaction and checks `rowCount === 1` to decide won/lost the race. This is the only place that
matters for the anti-double-scan guarantee — never read-then-write here.

**Boundaries.** Cross one of these the wrong way and the build breaks:

| Layer | May import from | Must never |
|---|---|---|
| `src/app/**` (routes, actions, route handlers) | `components`, `server`, `lib` | Import `db/` directly |
| `src/components/**` | `lib`, other components | Import `server/` or `db/` |
| `src/server/**` | `db`, `lib` | Import React or anything in `components/` |
| `src/db/**` | nothing internal | Import `server/` |

**Where things live.**

| Concern | Single source of truth |
|---|---|
| DB schema | `src/db/schema.ts` — change here, then `pnpm exec drizzle-kit generate` |
| Env access | `src/lib/env.ts` — zod-validated at boot; never read `process.env` elsewhere |
| Design tokens | `src/app/globals.css` `@theme` block — no raw hex/px in components |
| QR signing/verification | `src/lib/qr-token.ts` — the only file that touches `QR_HMAC_SECRET` |
| Admin session | `src/lib/auth.ts` — one `auth.api.getSession()`, used everywhere |
| Station session | `src/lib/station-session.ts` — signed cookie, separate from admin auth |

## Code rules

1. **One component per file. Max 300 lines.** Longer means it should be split.
2. **Path alias `@/` → `src/`.** No `../../..` imports.
3. **`.ts`/`.tsx` relative specifiers, never `.js`.** `tsconfig.json` sets
   `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` — this is the one resolution
   convention on this project and it applies in app source, tests, and standalone scripts alike.
4. **Server-first.** Components are Server Components by default. Add `"use client"` only for
   state, effects, camera access, or event handlers — pushed to the leaf, never the page.
5. **No barrel files.** Import from the source module; `index.ts` re-exports break tree-shaking.
6. **Validate at the edge.** Every server action and route handler parses its input with a zod
   schema from `src/lib/schemas.ts` before touching `src/server/`.
7. **Errors return typed results**, never thrown strings from a server action:
   `{ ok: true, data } | { ok: false, error: { code, message } }`.
8. **`src/server/tickets.ts` is the only writer of the `ticket` table.** No route, action, or
   script updates `ticket.status` directly — see the atomic-update rule in
   `.claude/rules/verification.md`.
9. **No new dependency without a reason in the commit message.**

## Design system

Tokens live once in `src/app/globals.css`'s `@theme` block. Components reference token names only.

| Role | Light | Dark | Used for |
|---|---|---|---|
| `--color-primary` | `#B8860B` | `#D4A73C` | primary buttons, active states, links |
| `--color-primary-foreground` | `#1A1408` | `#1A1408` | text on primary |
| `--color-secondary` | `#3A3D3E` | `#6B7073` | secondary text/actions |
| `--color-background` | `#FAFAF8` | `#15161A` | page background |
| `--color-surface` | `#FFFFFF` | `#1F2023` | cards, panels |
| `--color-border` | `#E4E2DC` | `#2C2D31` | dividers, input outlines |
| `--color-foreground` | `#1A1A1A` | `#F2F2F0` | body text |
| `--color-muted-foreground` | `#5B5F61` | `#A2A6A8` | captions, placeholders |
| `--color-danger` | `#A31E24` | `#E5484D` | already-verified, errors |
| `--color-success` | `#1F4D36` | `#3FA772` | verified, pagado |

- **Type:** headings `Fraunces` 600/700; body/UI `Inter` 400/500/600; scale 12/14/16/18/24/32 px,
  base 16px, line-height 1.5.
- **Radius:** `rounded-xl` (12px) cards, `rounded-lg` (8px) inputs/buttons.
- **Touch targets:** 56-64px height on buttons in `/registro`, `/mi-ticket` and `/verificar`.
- **Motion:** 150-200ms, ease-out. Respect `prefers-reduced-motion: reduce`.
- **Status badges:** always color + icon + text — never color alone (verificado = green check,
  pendiente = amber clock).

## Environment

| Variable | Required from | Used by | Source |
|---|---|---|---|
| `DATABASE_URL` | step 1 | `src/db/client.ts`, `drizzle.config.ts` | Neon console |
| `TEST_DATABASE_URL` | step 1 | `tests/setup.ts` | `docker-compose.yml` (local) |
| `BETTER_AUTH_SECRET` | step 3 | `src/lib/auth.ts` | `pnpm exec @better-auth/cli secret` |
| `BETTER_AUTH_URL` | step 3 | `src/lib/auth.ts` | deployment URL |
| `QR_HMAC_SECRET` | step 5 | `src/lib/qr-token.ts` | `openssl rand -hex 32` |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | step 3 | `scripts/seed-admin.ts` | chosen by admin |

`.env.example` is committed and stays in sync. `.env*` files with real values never are.

## Rules

| File | Applies to |
|---|---|
| `.claude/rules/database.md` | `src/db/**`, `migrations`, `drizzle/**` |
| `.claude/rules/verification.md` | `src/server/verify.ts`, `src/app/api/verify/**` |
| `.claude/rules/styling.md` | `src/app/**/*.tsx`, `src/components/**` |

## Non-negotiable

1. `src/server/verify.ts` never does read-then-write on `ticket.status` — one conditional `UPDATE`
   in a transaction, always. This is the whole anti-double-scan guarantee.
2. Never log `dni`, `cip`, or the raw QR token content at `info` level or above.
3. Never commit secrets, `.env`, or generated build output.
4. Never hand-edit a file `drizzle-kit generate` produced under `drizzle/`.
5. Never mark a task done with a failing gate command.
6. The `pagado` field is informational only — never gate registration or verification on it.
