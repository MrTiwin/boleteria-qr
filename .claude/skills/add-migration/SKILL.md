---
name: add-migration
description: Use when a schema change is needed in src/db/schema.ts and a new Drizzle migration must be generated and applied against the local test database.
---

# Add a migration

## When to use
Any edit to `src/db/schema.ts` — new table, new column, new index, new constraint.

## Steps
1. Edit `src/db/schema.ts`.
2. `pnpm exec drizzle-kit generate` — do not name the output file yourself, the tool picks it.
3. Read the generated SQL under `drizzle/` and confirm it matches the intent (no accidental
   `DROP` on a column still in use).
4. `pnpm exec drizzle-kit migrate` against `TEST_DATABASE_URL`.
5. Run the affected test file.

## Verify
```bash
pnpm exec drizzle-kit migrate   # expect: exit 0, "migrations applied"
pnpm exec vitest run tests/db   # expect: 0 failed
```

## Do not
- Hand-author a file under `drizzle/` — the generator names and numbers them.
- Ship a destructive migration in the same step as the code that stops using the old shape.
