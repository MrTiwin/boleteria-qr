---
description: Schema and migration conventions
paths:
  - "src/db/**"
  - "drizzle/**"
  - "drizzle.config.ts"
---

- Every table has `id uuid primary key default gen_random_uuid()` and `created_at timestamptz not
  null default now()`.
- Change `src/db/schema.ts`, then run `pnpm exec drizzle-kit generate` — never hand-author a file
  under `drizzle/`; the tool names its own migration files.
- `ticket.personnel_id` is `unique` — one person, one ticket, enforced at the database, not just
  in application code.
- `ticket_download_log` is append-only. Never delete or update a row in it; it is the audit trail
  for the CIP+DNI weak-credential risk documented in the blueprint's risk register.
- No destructive migration (`DROP COLUMN`, `DROP TABLE`) ships in the same step as the code that
  stops using the old shape. Expand, deploy, backfill, then contract in a later step.
