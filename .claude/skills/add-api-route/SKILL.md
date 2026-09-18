---
name: add-api-route
description: Use when adding a new Next.js route handler under src/app/api/ that needs input validation, a typed response envelope, and a test.
---

# Add an API route

## When to use
Any new endpoint under `src/app/api/`.

## Steps
1. Define the request/response shapes with `zod` in `src/lib/schemas.ts`.
2. Write `src/app/api/{route}/route.ts` — parse input with the schema first, call into
   `src/server/{domain}.ts` for the business logic, never touch `src/db/` directly from the route.
3. Return `{ ok: true, data }` on success, `{ ok: false, error: { code, message } }` on failure,
   with the matching HTTP status.
4. Add `src/app/api/{route}/route.test.ts` covering the happy path and at least one validation
   failure.

## Verify
```bash
pnpm exec vitest run src/app/api/{route}   # expect: all tests pass
pnpm exec tsc --noEmit                      # expect: exit 0
```

## Do not
- Import `src/db/client.ts` from inside `src/app/**` — go through `src/server/`.
- Return a bare thrown error — always the typed envelope.
