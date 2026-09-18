# boleteria-qr — agent instructions

Sistema de boletería QR para un almuerzo institucional: registro con CIP+DNI, ticket QR firmado, y
verificación anti-doble-uso en 6-8 estaciones el día del evento.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Lint | `pnpm exec biome check .` |
| Unit tests | `pnpm exec vitest run` |
| E2E | `pnpm exec playwright test` |
| Build | `pnpm build` |

## Non-negotiable

1. `src/server/verify.ts` never does read-then-write on `ticket.status` — one conditional `UPDATE`
   in a transaction, always.
2. Never log `dni`, `cip`, or the raw QR token content.
3. Never commit secrets, `.env`, or generated build output.
4. Never hand-edit a file `drizzle-kit generate` produced.
5. Never mark a task done with a failing gate command.

Full architecture, boundaries, and design tokens: see `CLAUDE.md` in this directory.
