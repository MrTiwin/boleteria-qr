# Boletería QR — Blueprint

> Generado por The Architect el 2026-09-17
> Shape: internal-tool · `knowledge/shapes/internal-tool.md`
> Runtime track: ts-node (TypeScript/Node.js) · `knowledge/runtime-tracks/ts-node.md`
> Emission mode: bundle
> Blueprint version: 1
> Versions last verified: 2026-09-17 — ver §11 para provenance por paquete

---

## 1. Project Overview & Non-Goals

### Vision

Un sistema de boletería QR para un almuerzo de camaradería institucional de un solo día (evento
único, no recurrente, menos de 250 personas). El personal se registra por su cuenta en una web
pública, valida su identidad con CIP+DNI contra un listado precargado por el admin, y recibe un
ticket QR personal e intransferible que puede descargar como imagen y volver a consultar después.
El día del evento, 6-8 estaciones (celulares con cámara, sin instalar nada) escanean el QR de cada
persona; el servidor valida la firma HMAC del token y marca la asistencia con una actualización
atómica en base de datos que garantiza que un mismo QR nunca se marca como asistido dos veces,
incluso si dos estaciones lo escanean casi simultáneamente. El admin ve en tiempo real cuántos han
llegado y exporta la lista final de asistencia en CSV.

### Users

| Persona | What they come to do | Frequency |
|---|---|---|
| Personal institucional | Registrarse, ver/descargar su ticket QR, volver a buscarlo si cierra la pestaña | Una vez, en los días previos al evento |
| Staff de estación | Iniciar sesión con el código de su estación y escanear QRs el día del evento | Una vez, durante 2-4 horas el día del evento |
| Admin (1-2 personas) | Subir el listado de personal, gestionar códigos de estación, ver el contador en vivo, exportar el CSV final | Varias veces en la semana previa + durante el evento |

### Goals — v1 scope

1. El personal puede registrarse por su cuenta validando CIP+DNI y recibir un ticket QR único e
   intransferible, sin intervención manual del admin.
2. Un ticket QR solo puede marcarse como "asistió" una vez, sin importar cuántas estaciones lo
   escaneen ni qué tan cerca en el tiempo lo hagan.
3. El admin ve un contador de asistencia en tiempo casi real y puede exportar la lista final de
   asistencia en CSV al terminar el evento.

### Non-Goals — explicitly out of scope for v1

| Not building | Why not now | Revisit when |
|---|---|---|
| Soporte multi-evento | El sistema existe para un evento puntual; generalizar ahora es costo sin beneficio | Si la institución decide reusar el sistema para un segundo evento |
| Edición del listado fila-por-fila desde la UI | El listado se sube una sola vez antes del evento; editar filas individuales añade una superficie de UI y de permisos que nadie necesita para un evento de un día | Si el sistema pasa a usarse de forma recurrente y el listado necesita mantenerse vivo entre eventos |
| Pagos dentro del sistema | `pagado` es solo informativo del CSV; cobrar dinero es una responsabilidad regulatoria distinta que no se justifica para un almuerzo interno | Si la institución empieza a cobrar el evento y necesita conciliar pagos automáticamente |
| App nativa (iOS/Android) | El navegador con cámara cubre el caso de uso de escaneo sin fricción de instalación en 6-8 celulares prestados el día del evento | Si el evento crece a un tamaño donde el escaneo offline se vuelve crítico |
| Escaneo/verificación offline sin internet | Vercel + Neon son remotos; construir un modo offline duplica la lógica de sincronización para un evento de bajo riesgo si hay wifi confiable | Si el local del evento no tiene conectividad confiable y no se puede resolver con datos móviles |
| Login social / SSO para el personal | El personal se identifica con CIP+DNI, no con una cuenta; SSO añade complejidad sin resolver el problema real (identidad física en la puerta) | Si la institución exige integrarse con su directorio corporativo existente |
| Tiempo real por websockets | Un evento de <250 personas y polling de ~5s no necesita la complejidad operativa de mantener conexiones abiertas | Si el evento crece a miles de personas o el admin necesita latencia sub-segundo |

**The builder must not implement anything in this table**, even if it seems like a small addition
while working on an adjacent step. If a step appears to require a non-goal, that is a blueprint
defect — stop and report it rather than expanding scope.

### Success metrics

| Metric | Target | How measured |
|---|---|---|
| Doble-verificación de un mismo ticket | 0 en producción, el día del evento | `SELECT count(*) FROM ticket WHERE status='verified' GROUP BY id HAVING count(*) > 1` nunca devuelve filas — es estructuralmente imposible por el `UPDATE` condicionado, no solo observado |
| Tickets emitidos vs. personal cargado | ≥ 90% del personal se registra antes del día del evento | `SELECT count(*) FROM ticket` / `SELECT count(*) FROM personnel` desde el dashboard admin |
| Tiempo de escaneo por estación | < 3 segundos por persona en la puerta | Observación manual el día del evento (no es un gate de build, es una meta operativa) |

---

## 2. Tech Stack

**Runtime track: ts-node.** Esta tabla nombra *elecciones*, no versiones. Cada pin de versión vive
en la Sección 11 y en ningún otro lugar.

| Layer | Choice | Why this, over what |
|---|---|---|
| Language / runtime | TypeScript ~6.0.3 sobre Node.js 24 (LTS) | Un solo lenguaje cliente/servidor/scripts; TS 7 (Go-native) todavía rompe la tooling de varios frameworks — se queda en la línea 6.x por ahora |
| Framework | Next.js 16 (App Router) | Un solo despliegue para páginas públicas, dashboard admin y API routes; Vercel es zero-config sobre él |
| Styling | Tailwind CSS 4 (config en CSS) | Config en `@theme`, sin JS de config; coincide con el sistema de diseño ya decidido en Fase 3 |
| Component layer | shadcn/ui (copiado al repo, base Radix) | Componentes editables in-repo en vez de una dependencia de caja negra; crítico para los botones táctiles grandes que pide `/registro`/`/verificar` |
| Database | Postgres (Neon) | Serverless, branch-per-PR gratis, y el único motor que necesita este volumen de datos (<250 filas) |
| ORM / data access | Drizzle ORM | SQL-shaped, sin motor de codegen pesado como Prisma; el `UPDATE ... WHERE status='issued'` atómico se escribe directo, sin pelear con un ORM que abstrae transacciones |
| Auth | Better Auth (self-hosted, email/password) para 1-2 admins · código de autorización propio (hash en tabla, cookie de sesión) para estaciones | El admin necesita cuentas reales; las estaciones no son personas, son dispositivos compartidos — una cuenta por estación sería sobre-ingeniería |
| Background work | Ninguno | No hay trabajo asíncrono que sobreviva al request — todo es CRUD + polling |
| Payments | NOT APPLICABLE | `pagado` es un campo informativo del CSV, no un flujo de cobro (ver Non-Goals) |
| File storage | Ninguno — el QR se genera on-the-fly server-side y el CSV en memoria | El volumen (<250 personas) no justifica un bucket de objetos |
| Email / notifications | Ninguno en v1 | El personal recibe su ticket viendo la pantalla, no por correo — reduce superficie de fallo en la semana del evento |
| Hosting | Vercel | Next.js zero-config, y coincide con la elección de framework |
| Package manager | pnpm | Instalación estricta que detecta dependencias fantasma; elección por defecto del runtime track |

### Compatibility check

Checked against `knowledge/stack-compatibility.md` — no known-bad combinations. El único cuidado
documentado en el runtime track (Biome 2.5.5 necesita `css.parser.tailwindDirectives: true` para
parsear el bloque `@theme` de Tailwind 4) está resuelto explícitamente en §10's Bootstrap.

---

## 3. Directory Structure

```
boleteria-qr/
  .github/workflows/ci.yml     # pipeline: install → typecheck → lint → test → build
  .nvmrc                        # "24" — escrito por Bootstrap
  .env.example                  # todas las vars, valores falsos — §10
  docker-compose.yml            # Postgres local para tests — §19.6
  drizzle.config.ts             # CLI standalone de drizzle-kit — §19.6
  vitest.config.ts              # runner de unit tests — §19.6
  playwright.config.ts          # runner de e2e — §19.6
  biome.json                    # generado por el scaffold, editado en Bootstrap
  tsconfig.json                 # generado por el scaffold, editado en Bootstrap
  package.json                  # generado por el scaffold (`pnpm create next-app`), editado en Bootstrap
  drizzle/                      # migraciones SQL generadas — NUNCA editadas a mano
  scripts/
    import-personnel.ts         # CLI: importa el CSV de personal — E1-T2
    seed-admin.ts                # CLI: crea la cuenta admin inicial — E1-T3
  src/
    app/
      registro/                 # formulario de registro público — E1-T4
        page.tsx
        actions.ts
      mi-ticket/                 # re-búsqueda de ticket — E1-T7
        page.tsx
        actions.ts
      ticket/[id]/                # pantalla del ticket con QR — E1-T5
        page.tsx
      verificar/                   # UI de escaneo para estaciones — E2-T2
        page.tsx
        login/page.tsx              # login de estación — E2-T1
      (admin)/                       # route group: requiere sesión admin
        login/page.tsx                # login admin — E2-T3
        admin/
          page.tsx                     # dashboard: contador + tabla — E2-T3
          estaciones/                   # gestión de estaciones — E2-T1
            page.tsx
            actions.ts
      api/
        auth/[...all]/route.ts          # Better Auth catch-all — E1-T3
        verify/route.ts                  # escaneo de estación — E2-T2
        tickets/[id]/download/route.ts    # log de descargas — E1-T6
        admin/stats/route.ts               # polling del dashboard — E2-T3
        admin/export/route.ts               # CSV final — E2-T4
        health/route.ts                      # readiness check — E2-T6
      globals.css                            # tokens @theme — E2-T5
    components/
      ticket-card.tsx            # QR + descarga — E1-T6
      qr-scanner.tsx              # wrapper html5-qrcode — E2-T2
      attendance-table.tsx         # tabla filtrable admin — E2-T3
      status-badge.tsx              # color + ícono + texto — E2-T5
      ui/                             # primitivas shadcn — generadas, editar libremente
    server/                            # única capa que escribe en la base de datos
      tickets.ts                        # único writer de `ticket` — E1-T4/E1-T5
      ticket-downloads.ts                # E1-T6
      rate-limit.ts                       # E1-T7
      stations.ts                          # E2-T1
      verify.ts                             # el UPDATE atómico — E2-T2
      export.ts                              # E2-T4
    lib/
      env.ts                # zod sobre process.env — E1-T1
      schemas.ts              # zod schemas compartidos — E1-T2/E1-T4
      import-personnel.ts      # parseo/validación CSV — E1-T2
      auth.ts                   # instancia Better Auth — E1-T3
      qr-token.ts                # firma/verificación HMAC — E1-T5
      qr-image.ts                 # PNG server-side — E1-T5
      station-session.ts           # cookie firmada de estación — E2-T1
    db/
      schema.ts            # las 5 tablas — E1-T1
      client.ts              # cliente Drizzle exportado — E1-T1
    proxy.ts                # protección de rutas /admin — E1-T3 (NO middleware.ts)
  tests/
    setup.ts                 # carga TEST_DATABASE_URL — §19.6
    stubs/server-only.ts       # stub del guard de Next.js — §19.6
    db/client.test.ts
    lib/import-personnel.test.ts
    lib/auth.test.ts
    lib/qr-token.test.ts
    server/tickets.test.ts
    server/ticket-downloads.test.ts
    server/rate-limit.test.ts
    server/stations.test.ts
    server/verify-concurrency.test.ts
    server/stats.test.ts
    server/export.test.ts
    server/health.test.ts
    e2e/accessibility.spec.ts
  .claude/
    settings.json
    skills/add-migration/SKILL.md
    skills/add-api-route/SKILL.md
    rules/database.md
    rules/verification.md
    rules/styling.md
  CLAUDE.md
  AGENTS.md
```

**Boundary rules**
- Nada en `src/app/**` importa `src/db/**` directamente — siempre a través de `src/server/**`.
- `src/server/tickets.ts` es el único archivo que escribe la tabla `ticket`; `src/server/verify.ts`
  es el único que la transiciona a `status='verified'`.
- `src/components/**` nunca importa `src/server/**` ni `src/db/**`.

**Resolution convention.** Especificadores relativos `.ts`, nunca `.js`, en todo el proyecto —
código de app, tests y scripts standalone por igual. `tsconfig.json` lleva
`allowImportingTsExtensions` + `rewriteRelativeImportExtensions` (generado y editado en §10's
Bootstrap). Reconciliado en la matriz de §19.6.

Todo archivo dibujado en este árbol tiene exactamente un origen: lo autora un paso de §9 (nombrado
en su lista **Do** y su `files[]` en `tasks.json`), o se emite como archivo real bajo `workspace/`
en §19.6 y llega vía la copia única antes del paso 1. `package.json`, `tsconfig.json` y `biome.json`
son generados por el comando de scaffold en §10 y editados ahí mismo — ver §10, *Bootstrap*.

---

## 4. Data Model

### Entities

**`personnel`** — una fila por persona del listado institucional, importada una sola vez desde CSV.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `grado` | text | not null | |
| `apellidos` | text | not null | |
| `nombres` | text | not null | |
| `cip` | text | not null, unique | identidad primaria de búsqueda/validación |
| `dni` | text | not null | segundo factor de validación junto a `cip` |
| `pagado` | boolean | not null, default `false` | informativo únicamente — nunca gatea registro ni verificación |
| `created_at` | timestamptz | not null, default `now()` | |

**`ticket`** — el ticket QR de una persona. Vida: `issued` → `verified` (nunca vuelve atrás).

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | codificado (firmado) dentro del QR |
| `personnel_id` | uuid | FK → `personnel.id`, unique, not null | una persona, un ticket — enforced en la BD |
| `qr_token` | text | not null, unique | payload HMAC-firmado, no reversible sin `QR_HMAC_SECRET` |
| `status` | text | not null, default `'issued'`, check in `('issued','verified')` | transición solo vía `src/server/verify.ts` |
| `created_at` | timestamptz | not null, default `now()` | |
| `verified_at` | timestamptz | nullable | seteado solo por el `UPDATE` atómico |
| `verified_by_station` | uuid | nullable, FK → `verification_station.id` | |
| `download_count` | integer | not null, default `0` | |
| `downloaded_at` | timestamptz | nullable | última descarga |

**`ticket_download_log`** — auditoría append-only de cada descarga del ticket.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `ticket_id` | uuid | FK → `ticket.id`, not null | |
| `ip` | text | not null | mitigación parcial del riesgo de CIP+DNI como credencial débil — ver §20.2 |
| `created_at` | timestamptz | not null, default `now()` | |

**`verification_station`** — una fila por dispositivo/punto de escaneo el día del evento.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `label` | text | not null | ej. "Puerta Norte" |
| `code_hash` | text | not null, unique | hash del código de autorización, nunca el texto plano |
| `active` | boolean | not null, default `true` | desactivar revoca el código sin borrarlo |
| `created_by_admin` | text | not null | email del admin que la creó/rotó |
| `created_at` | timestamptz | not null, default `now()` | |

**`ticket_search_attempt`** — ledger de intentos de búsqueda para el rate limiting de `/mi-ticket`.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `cip` | text | not null | |
| `success` | boolean | not null | |
| `created_at` | timestamptz | not null, default `now()` | |

Las tablas propias de Better Auth (usuarios admin, sesiones, cuentas, verificación) se generan con
`pnpm exec @better-auth/cli generate` en `E1-T3` y se fusionan a `src/db/schema.ts` — sus nombres y
columnas exactas los decide la CLI, no este documento; nunca se les inventa un nombre aquí.

### Relationships

- `personnel` —(1:0..1)→ `ticket` vía `ticket.personnel_id` (unique). `ON DELETE CASCADE` no aplica
  — `personnel` nunca se borra fila a fila en v1 (ver Non-Goals); un re-import reemplaza la tabla
  completa dentro de una transacción.
- `ticket` —(1:N)→ `ticket_download_log` vía `ticket_download_log.ticket_id`, `ON DELETE CASCADE`
  (si un ticket se elimina, su log de auditoría no tiene sentido sin él).
- `verification_station` —(1:N)→ `ticket` vía `ticket.verified_by_station`, `ON DELETE SET NULL`
  (una estación desactivada no debe invalidar la asistencia ya registrada).

### Indexes

| Table | Index | Why |
|---|---|---|
| `personnel` | unique(`cip`) | búsqueda de validación en registro y `/mi-ticket` |
| `ticket` | unique(`personnel_id`) | garantiza un ticket por persona a nivel de BD, no solo de aplicación |
| `ticket` | unique(`qr_token`) | lookup directo desde el escaneo, y evita colisiones |
| `ticket_search_attempt` | (`cip`, `created_at`) | la consulta de rate limiting cuenta fallos por `cip` en la última hora |
| `ticket_download_log` | (`ticket_id`) | listar descargas de un ticket para auditoría |

### Schema

```typescript
// src/db/schema.ts
import { pgTable, uuid, text, boolean, timestamp, integer, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const personnel = pgTable("personnel", {
  id: uuid("id").primaryKey().defaultRandom(),
  grado: text("grado").notNull(),
  apellidos: text("apellidos").notNull(),
  nombres: text("nombres").notNull(),
  cip: text("cip").notNull().unique(),
  dni: text("dni").notNull(),
  pagado: boolean("pagado").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationStation = pgTable("verification_station", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  codeHash: text("code_hash").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdByAdmin: text("created_by_admin").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticket = pgTable(
  "ticket",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personnelId: uuid("personnel_id").notNull().unique().references(() => personnel.id),
    qrToken: text("qr_token").notNull().unique(),
    status: text("status").notNull().default("issued"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedByStation: uuid("verified_by_station").references(() => verificationStation.id, {
      onDelete: "set null",
    }),
    downloadCount: integer("download_count").notNull().default(0),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true }),
  },
  (t) => [check("ticket_status_check", sql`${t.status} in ('issued','verified')`)],
);

export const ticketDownloadLog = pgTable("ticket_download_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => ticket.id, { onDelete: "cascade" }),
  ip: text("ip").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketSearchAttempt = pgTable("ticket_search_attempt", {
  id: uuid("id").primaryKey().defaultRandom(),
  cip: text("cip").notNull(),
  success: boolean("success").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### Migrations

Drizzle Kit genera las migraciones — `pnpm exec drizzle-kit generate` produce el archivo SQL bajo
`drizzle/` con el nombre y número que la herramienta elige; nunca se le pone nombre a mano.
`pnpm exec drizzle-kit migrate` las aplica. Regla de producción: expand-then-contract — ninguna
migración destructiva (`DROP COLUMN`/`DROP TABLE`) en el mismo paso que el código que deja de usar
la forma vieja.

### Seed data

`pnpm exec tsx scripts/seed-admin.ts` crea la única cuenta admin desde
`ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` (idempotente — un segundo run no duplica). No hay seed de
`personnel`: esa tabla se llena con el import real de CSV (`E1-T2`), nunca con datos de ejemplo,
porque los datos reales son el punto de partida operativo del evento.

---

## 5. API Design

### Conventions

- Base path: rutas bajo `src/app/api/**`, sin prefijo `/v1` — proyecto de un solo release, sin
  necesidad de versionado.
- Response envelope: `{ ok: true, data }` en éxito, `{ ok: false, error: { code, message } }` en
  fallo — una sola forma, sin excepciones, usada por toda acción de servidor y toda route handler.
- Error codes: `INVALID_CREDENTIALS`, `CONSENT_REQUIRED`, `RATE_LIMITED`, `INVALID_SIGNATURE`,
  `UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR` — mapeados 1:1 a un status HTTP (400/401/404/429).
- Validation: `zod`, schemas centralizados en `src/lib/schemas.ts`, parseados en el borde antes de
  tocar `src/server/**`.
- Pagination: NOT APPLICABLE — ningún listado de este sistema supera 250 filas.
- Idempotency: `POST /registro` (vía `createOrGetTicket`) es idempotente por `personnel_id`;
  `POST /api/verify` es idempotente por ticket id a nivel de resultado observable (segunda llamada
  responde "ya verificado" en vez de fallar).
- Rate limits: `POST /mi-ticket` — máx. 5 intentos fallidos por `cip` por hora, backend:
  `ticket_search_attempt` en Postgres (ver §4).

### Routes

| Method | Path | Description | Auth | Rate limit |
|---|---|---|---|---|
| POST | `/registro` (server action) | Valida CIP+DNI, crea/recupera ticket | público | ninguno (ver riesgo aceptado §20.2) |
| POST | `/mi-ticket` (server action) | Re-busca un ticket por CIP+DNI | público | 5 fallos/hora por CIP |
| GET | `/ticket/[id]` | Muestra QR + tarjeta del ticket | público (posesión del `id` = acceso) | ninguno |
| POST | `/api/tickets/[id]/download` | Registra una descarga | público | ninguno |
| POST | `/api/verify` | Marca un ticket como verificado | sesión de estación | ninguno |
| GET | `/api/admin/stats` | Contador verificados/total | sesión admin | ninguno |
| GET | `/api/admin/export` | CSV de asistencia final | sesión admin | ninguno |
| GET | `/api/health` | Readiness check (DB real) | público | ninguno |
| ALL | `/api/auth/[...all]` | Better Auth catch-all | según Better Auth | ninguno |

### Critical endpoints — full detail

**`POST /api/verify`** — el endpoint del que depende toda la garantía anti-doble-uso.

- Request: `{ token: string }` — el string crudo decodificado del QR.
- Éxito, ticket nuevo: `200 { ok:true, data:{ alreadyVerified:false, ticket:{ id, nombreCompleto } } }`.
- Éxito, ya verificado: `200 { ok:true, data:{ alreadyVerified:true, verifiedAt, stationLabel } }` —
  nunca un error; un ticket ya usado es un resultado válido del negocio, no un fallo del sistema.
- Firma inválida: `400 { ok:false, error:{code:'INVALID_SIGNATURE', message:'QR inválido'} }` — se
  responde **antes** de cualquier consulta a la base de datos.
- Sin sesión de estación: `401 { ok:false, error:{code:'UNAUTHORIZED'} }`.
- Efecto secundario en el caso "nuevo": exactamente una fila de `ticket` actualizada
  (`status`, `verified_at`, `verified_by_station`), vía el `UPDATE ... WHERE status='issued'`
  atómico descrito en §9 paso `E2-T2` y `.claude/rules/verification.md`.

**`POST /registro` (server action)** — crea el ticket.

- Request: `{ personnelId: string, cip: string, dni: string, consent: boolean }`.
- Validación: `personnelId` debe existir; `cip` debe igualar el `cip` de esa fila; `dni` debe igualar
  el `dni` de esa fila; `consent` debe ser `true`.
- Éxito: `{ ok:true, data:{ ticketId } }` — mismo `ticketId` si ya existía uno para esa persona.
- Fallos: `INVALID_CREDENTIALS` (cip/dni no coinciden), `CONSENT_REQUIRED` (checkbox sin marcar).
- Efecto secundario: como máximo una fila nueva en `ticket`, nunca más de una por `personnel_id`.

---

## 6. Frontend Architecture

### Routes

| Route | Page | Data source | Auth |
|---|---|---|---|
| `/registro` | Formulario de registro | lista de `personnel` cargada server-side | público |
| `/mi-ticket` | Re-búsqueda CIP+DNI | server action | público |
| `/ticket/[id]` | QR + tarjeta descargable | `ticket` + `personnel` por id | público (posesión del link) |
| `/verificar/login` | Código de estación | server action | público |
| `/verificar` | Escaneo con cámara | `/api/verify` | sesión de estación |
| `/login` | Login admin | Better Auth | público |
| `/admin` | Dashboard: contador + tabla | `/api/admin/stats`, polling | sesión admin |
| `/admin/estaciones` | Gestión de estaciones | server actions | sesión admin |

### Rendering strategy

`/registro`, `/mi-ticket`, `/ticket/[id]`, `/login` son Server Components con mutaciones vía Server
Actions — sin necesidad de revalidación agresiva, cada visita es fresca. `/verificar` y `/admin` son
híbridos: el shell es Server Component, `qr-scanner.tsx` y `attendance-table.tsx` (con TanStack
Query) son los únicos leaves `"use client"`. Nada usa `"use cache"` — todo el sistema son datos que
cambian minuto a minuto el día del evento; el caching estático sería el bug, no la optimización.

### Component hierarchy

```
/admin
  page.tsx (server)
    <AttendanceStats />      # client, TanStack Query, poll ~5s → /api/admin/stats
    <AttendanceTable />      # client, filtro por status, usa <StatusBadge />
/verificar
  page.tsx (server, valida cookie de estación)
    <QrScanner />             # client, html5-qrcode, POST /api/verify, flash verde/ámbar
```

### State management

Server state (contador, tabla) vive en TanStack Query con polling — nunca en `useState` global.
Estado de formulario vía `react-hook-form` + `zod` resolver, local a cada página. Nada de estado
global compartido entre rutas: cada página del personal es una visita aislada, y el dashboard admin
no comparte estado con `/verificar`.

### Loading, empty, and error states

- `/admin`: tabla vacía antes del primer import → "Todavía no se ha importado el listado de
  personal." con un enlace a la subida de CSV. Error de red en el polling → el último valor
  conocido se mantiene visible con un indicador "actualizando…", nunca un blank screen.
- `/verificar`: sin cámara/permiso denegado → mensaje explícito con instrucciones, nunca un canvas
  en blanco. Ticket no encontrado/token inválido → flash rojo + texto "QR inválido", nunca solo un
  color.
- `/registro`, `/mi-ticket`: error de validación inline bajo el campo, nunca solo un toast genérico.

---

## 7. Design System

Definido en la Fase 3 a partir de la paleta del escudo institucional.

### Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-primary` | `#B8860B` | `#D4A73C` | botones primarios, enlaces, foco |
| `--color-primary-foreground` | `#1A1408` | `#1A1408` | texto sobre primary |
| `--color-secondary` | `#3A3D3E` | `#6B7073` | texto/acciones secundarias |
| `--color-background` | `#FAFAF8` | `#15161A` | fondo de página |
| `--color-surface` | `#FFFFFF` | `#1F2023` | tarjetas, paneles, modales |
| `--color-border` | `#E4E2DC` | `#2C2D31` | divisores, bordes de input |
| `--color-foreground` | `#1A1A1A` | `#F2F2F0` | texto de cuerpo |
| `--color-muted-foreground` | `#5B5F61` | `#A2A6A8` | texto secundario |
| `--color-danger` | `#A31E24` | `#E5484D` | ya verificado, errores |
| `--color-success` | `#1F4D36` | `#3FA772` | verificado, pagado |

**Contraste:** `#1A1A1A` sobre `#FAFAF8` ≈ 18.5:1 (AAA). `#B8860B` sobre `#1A1408` ≈ 7.6:1 (AAA
para texto grande, cumple AA para texto normal). `#5B5F61` sobre `#FFFFFF` ≈ 5.1:1 (AA). Los tres
pares más riesgosos del set cumplen WCAG 2.2 AA.

### Typography

| Role | Family | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| Display/Heading | Fraunces | 24-32px / 1.3 | 600/700 | normal |
| Body / UI | Inter | 14-16px / 1.5 | 400/500/600 | normal |
| Mono (números tabulares) | Inter (tabular-nums) | 16-18px / 1.5 | 600 | normal |

**Font loading:** self-hosted vía `next/font/google` (Fraunces, Inter), subset `latin`,
`display: "swap"`, fallback `system-ui, sans-serif`.

### Spacing, radius, elevation

- Spacing scale: base 4px — 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: `rounded-xl` (12px) tarjetas, `rounded-lg` (8px) inputs/botones.
- Shadows: `shadow-sm` en tarjetas sobre `surface`; sin elevación en botones (flat, borde en vez de
  sombra).
- Max content width: 640px en formularios públicos, 1120px en `/admin`. Breakpoints: 375 / 768 /
  1024 / 1280.

### Motion

150-200ms, `ease-out`, solo `transform`/`opacity`. El flash de verificación (`/verificar`) es la
única animación con significado funcional — 200ms de fondo de color + ícono, respeta
`prefers-reduced-motion: reduce` sustituyendo la animación por un cambio instantáneo de estado.

### Component style

Minimalista flat, tarjetas con `shadow-sm` y `rounded-xl`, botones táctiles grandes (56-64px de
alto) en `/registro`, `/mi-ticket` y `/verificar` porque se usan de pie, en un celular, con prisa.
Badges de estado siempre color + ícono + texto. Un componente nuevo pertenece a este sistema si usa
solo los tokens de arriba y respeta el piso de 56px en botones de las tres pantallas móviles.

---

## 8. Authentication & Authorization

### Provider and rationale

Dos mecanismos distintos, deliberadamente separados (de `knowledge/capabilities/auth.md`):
**Better Auth** (self-hosted, email/password, 1-2 cuentas) para el admin, y un **código de
autorización propio** (hash en `verification_station.code_hash`, cookie de sesión de estación) para
las 6-8 estaciones — una estación es un dispositivo compartido, no una persona con cuenta.

### Flows

- **Admin:** `/login` → Better Auth email/password → sesión → `/admin`. Sin registro público, sin
  recuperación de contraseña automatizada en v1 (1-2 cuentas, se resetea manualmente vía
  `scripts/seed-admin.ts` o la consola de Better Auth si hace falta). Cierre de sesión: botón en
  `/admin` que invalida la sesión de Better Auth.
- **Estación:** `/verificar/login` → código de estación → hash comparado contra
  `verification_station.code_hash` (solo si `active=true`) → cookie firmada de estación → `/verificar`.
  Sin logout explícito requerido — la cookie expira en 12 horas, suficiente para un evento de un día.
- **Personal:** sin cuenta. `cip`+`dni` es la credencial de un solo uso por flujo (registro o
  re-búsqueda), nunca una sesión persistente.

### Route protection

| Surface | Rule | Enforced where |
|---|---|---|
| `/admin/*` | sesión Better Auth válida | `src/proxy.ts` (matcher `/admin/:path*`) + `auth.api.getSession` en cada route handler bajo `/api/admin/**` |
| `/verificar` | cookie de sesión de estación válida y estación `active` | `src/lib/station-session.ts`, verificado server-side en `page.tsx` y en `/api/verify` |
| `/api/verify` | sesión de estación | verificado dentro del route handler, nunca solo por el cliente |
| `/api/admin/**` | sesión admin | verificado dentro de cada route handler |

**Enforcement rule:** la autorización se verifica server-side en cada request. Un guard de UI nunca
es la única barrera.

### Roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Admin | importar CSV, gestionar estaciones, ver contador/tabla, exportar CSV | escanear tickets (no tiene sesión de estación) |
| Estación | escanear y verificar tickets | ver el dashboard, gestionar otras estaciones, exportar CSV |
| Personal (sin cuenta) | registrarse, ver/descargar su propio ticket, re-buscarlo | ver tickets de otras personas, escanear |

### Sessions

Admin: cookie de sesión de Better Auth, `HttpOnly`, `Secure` en producción, `SameSite=Lax`, TTL por
defecto de Better Auth (7 días con renovación deslizante). Estación: cookie firmada propia (HMAC,
mismo mecanismo de `qr-token.ts` reutilizado con un propósito distinto), `HttpOnly`, `Secure`,
`SameSite=Lax`, TTL 12 horas fijas — no se renueva, para forzar re-login si el evento se extiende
más de lo esperado. CSRF: mutaciones vía Server Actions (protección CSRF nativa de Next.js) o vía
route handlers que solo aceptan `Content-Type: application/json` desde el mismo origen.

### Multi-tenancy / row-level isolation

NOT APPLICABLE — evento único, sin conceptos de tenant u organización.

---

## 9. BUILD ORDER

**13 pasos, 2 épicas** (`ceil(13÷9)=2`, `floor(13÷5)=2` — el único split legal). Épica 1
(`01-foundation`, pasos 1-7): esquema, auth admin, y el flujo completo de registro → QR →
descarga → re-búsqueda. Épica 2 (`02-estaciones-dashboard`, pasos 8-13): estaciones, verificación
anti-doble-uso, dashboard, export, diseño/accesibilidad, y el pipeline de CI.

### Step map

| # | Step | Depends on | Touches | Gate |
|---|---|---|---|---|
| 1 | Scaffold + esquema Drizzle + init de repo | — | 5 files | `pnpm exec drizzle-kit migrate` crea las 4 tablas |
| 2 | Import CSV de personal | 1 | 4 files | `vitest run tests/lib/import-personnel.test.ts` |
| 3 | Auth admin (Better Auth) + protección de rutas | 1 | 5 files | `vitest run tests/lib/auth.test.ts` |
| 4 | Flujo de registro (CIP/DNI, ticket idempotente) | 1 | 5 files | `vitest run tests/server/tickets.test.ts` |
| 5 | QR firmado HMAC + pantalla de ticket | 4 | 5 files | `vitest run tests/lib/qr-token.test.ts` |
| 6 | Descarga como imagen + log de descargas | 5 | 4 files | `vitest run tests/server/ticket-downloads.test.ts` |
| 7 | Buscar mi ticket + rate limiting | 4 | 4 files | `vitest run tests/server/rate-limit.test.ts` |
| 8 | Gestión de estaciones + sesión de estación | 3 | 5 files | `vitest run tests/server/stations.test.ts` |
| 9 | Verificación por cámara + UPDATE atómico | 5, 8 | 5 files | `vitest run tests/server/verify-concurrency.test.ts` — 1 de 10 gana |
| 10 | Dashboard admin: contador + tabla + login UI | 3, 2, 9 | 5 files | `vitest run tests/server/stats.test.ts` |
| 11 | Export CSV de asistencia | 10 | 3 files | `vitest run tests/server/export.test.ts` |
| 12 | Diseño aplicado + responsive + accesibilidad | 10, 7, 9 | 4 files | `playwright test tests/e2e/accessibility.spec.ts` — 0 violaciones |
| 13 | CI pipeline + readiness de build de producción | 12 | 3 files | `pnpm build` + `GET /api/health` → 200 |

El paso 1 produce el primer artefacto ejecutable (el propio `db` client) y su propio `Verify` lo
ejercita con una migración real — no solo lo compila (§9 regla 13). Los 13 pasos corresponden
1:1 a las 13 tareas de `tasks.json` y a los bloques de tarea en `epics/01-foundation.md` y
`epics/02-estaciones-dashboard.md` — mismos ids, mismos criterios de aceptación, palabra por
palabra.

**El contenido completo de cada paso — Do / Done when / Verify / Checkpoint — vive en los archivos
de épica**, que son autocontenidos por diseño (`templates/epic-template.md`):

- `epics/01-foundation.md` — pasos 1-7 (`E1-T1` … `E1-T7`)
- `epics/02-estaciones-dashboard.md` — pasos 8-13 (`E2-T1` … `E2-T6`)

Y la fuente de verdad ejecutable de cada paso — `verify`, `files`, `checkpoint`, `dependencies` — es
`tasks.json`, en el mismo orden que esta tabla.

---

### 9.1 Parity and cutover

NOT APPLICABLE — greenfield build, no system is being replaced.

---

## 10. Environment Setup

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 24.18.0 (LTS) | `node -v` |
| pnpm | 11.17.0 | `pnpm -v` |
| Docker (para Postgres local de tests) | cualquier reciente | `docker compose version` |
| Git | cualquier reciente | `git --version` |

### Accounts to create first

| Servicio | URL de signup | Requerido desde |
|---|---|---|
| Neon (Postgres) | https://neon.tech | paso 1 |
| Vercel | https://vercel.com | paso 13 (deploy real, fuera del build gate — ver checklist de lanzamiento) |
| GitHub (para el pipeline de CI) | https://github.com | paso 13 |

### Environment variables

| Variable | Purpose | Where to get it | Required by step | Secret? |
|---|---|---|---|---|
| `DATABASE_URL` | conexión Postgres de producción/dev (Neon) | Neon console → Connection Details | 1 | sí |
| `TEST_DATABASE_URL` | Postgres local para tests, vía `docker-compose.yml` | valor fijo local — ver `.env.example` | 1 | no |
| `BETTER_AUTH_SECRET` | firma de sesiones admin | `pnpm exec @better-auth/cli secret` | 3 | sí |
| `BETTER_AUTH_URL` | URL base para callbacks de Better Auth | URL de despliegue (o `http://localhost:3000` en dev) | 3 | no |
| `QR_HMAC_SECRET` | firma HMAC de cada token QR | `openssl rand -hex 32` | 5 | sí |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | cuenta admin inicial | elegidos por el admin | 3 | sí (la contraseña) |

`.env.example` está commiteado con las seis variables presentes y valores falsos/obvios. `.env` y
`.env.*.local` están en `.gitignore`. `src/lib/env.ts` valida las variables requeridas al boot y
falla ruidosamente — nunca cae a un default para un secreto. La validación en `src/lib/env.ts` solo
exige `DATABASE_URL`/`TEST_DATABASE_URL` desde el paso 1; `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` se
vuelven requeridas recién en el paso 3, `QR_HMAC_SECRET` recién en el paso 5 — un validador que
exigiera las seis desde el paso 1 rompería el gate del paso 1 (§9 regla 9).

### Files that must be committed

| File | Why it is committed | Ignore-file exception line |
|---|---|---|
| `.env.example` | plantilla de variables para cualquier builder nuevo | `!.env.example` después del patrón `.env*` que genera el scaffold |
| `.nvmrc` | pin del runtime | no coincide con ningún patrón del ignore generado |
| `drizzle/` (migraciones generadas) | son parte del historial de esquema, no un build artifact | no coincide con ningún patrón del ignore generado |
| `.claude/`, `CLAUDE.md`, `AGENTS.md` | configuración del agente constructor | el scaffold de Next.js no ignora `.claude/` por defecto, pero se confirma explícitamente en Bootstrap |

### Bootstrap

```bash
# order matters: toolchain → scaffold → ignore-file check → repo init → first commit →
# extra deps → drizzle config edits → biome/tsconfig edits → migrate → seed

corepack enable --install-directory "$HOME/.local/bin"   # EACCES en instalaciones root sin esto
corepack prepare pnpm@11.17.0 --activate
node -v   # expect v24.x

# --biome da un proyecto solo-Biome; --eslint=false NO es un flag válido (silently ignored).
# El propio install de este comando puede abortar con ERR_PNPM_IGNORED_BUILDS y AÚN ASÍ salir con
# código 0 — no confiar en su exit code, el gate real es la línea `pnpm install` de abajo.
pnpm create next-app@latest . --ts --app --tailwind --biome --src-dir --use-pnpm
pnpm approve-builds --all           # clave `allowBuilds` en pnpm 11 — `onlyBuiltDependencies` falla en silencio
pnpm install --frozen-lockfile      # el gate real — recién aquí se sabe si el install funcionó

# Pin explícito de versiones sobre lo que trae el scaffold (que pisa toolchain@2.2.0 / typescript^5)
pnpm add -D typescript@~6.0.3 @biomejs/biome@2.5.5
pnpm add drizzle-orm@0.45.2 @neondatabase/serverless@1.1.0 zod@4.4.3 react-hook-form@7.83.0 \
  @tanstack/react-query@5.101.4 better-auth@1.6.25 qrcode@1.5.4 html5-qrcode@2.3.8 \
  html-to-image@1.11.13 dotenv@17
pnpm add -D drizzle-kit@0.31.10 vitest@4.1.10 @playwright/test@1.62.0 @vitejs/plugin-react@6.0.4 \
  @types/qrcode@1.5.6 tsx@4.23.1 @axe-core/playwright@4

# --biome ya escribió biome.json; `biome init` se niega a pisarlo. EDITAR:
#  1) bump "$schema" a la 2.5.5
#  2) { "css": { "parser": { "tailwindDirectives": true } } } — si no, Biome no parsea el @theme
#     de Tailwind 4 que trae el scaffold
#  3) agregar "blueprints" al array de "ignore" (o "files.ignore") — el bundle vive en
#     blueprints/boleteria-qr/ dentro del árbol del proyecto (ver §19.6)
pnpm exec biome check --write .

# tsconfig.json generado por el scaffold: agregar las dos flags de la convención de resolución y
# excluir la carpeta del bundle del type-check
#   "allowImportingTsExtensions": true, "rewriteRelativeImportExtensions": true
#   "exclude": ["node_modules", "blueprints"]

# shadcn init sin flags pregunta interactivamente y cuelga un build desatendido
pnpm dlx shadcn@4 init --base radix --no-monorepo

# .nvmrc — no lo escribe el scaffold
echo "24" > .nvmrc

# repo init idempotente — el scaffold de Next.js SÍ inicializa git, pero no asumirlo
git rev-parse --git-dir >/dev/null 2>&1 || git init -b main
# el .gitignore del scaffold excluye .env* por defecto — agregar la excepción ANTES del primer commit
printf '\n!.env.example\n' >> .gitignore
cp .env.example .env   # placeholder local; el builder reemplaza los valores reales
git add -A && git commit -m "chore: scaffold" --allow-empty

# el workspace/ de este bundle se copia UNA VEZ, sin pisar package.json/pnpm-lock.yaml si ya existen
rsync -a --ignore-existing workspace/ ./   # skip lo existente, exit 0 siempre

pnpm exec playwright install --with-deps   # los tests e2e fallan sin los binarios de browser

docker compose up -d test-db
until docker compose exec -T test-db pg_isready -U boleteria -d boleteria_test; do sleep 1; done
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
```

**Este bloque se ejecuta verbatim, dos veces seguidas, en un directorio scratch, antes de presentar
el blueprint** (`questions/phase-4-generate.md` Step 6). `rsync -a --ignore-existing` es un no-op
seguro en la segunda corrida (no falla en ninguna plataforma), y `docker compose up -d` /
`drizzle-kit generate` son idempotentes por diseño de sus propias herramientas.

---

## 11. Dependencies

Cada fila viene de una consulta en vivo al registro de npm el 2026-09-17, o del runtime track
`knowledge/runtime-tracks/ts-node.md` (verificado 2026-07-27) cuando el paquete no se consultó en
vivo esta sesión — marcado explícitamente en `Source`.

### Runtime

| Package | Version | Source | Checked | Installed by | Purpose |
|---|---|---|---|---|---|
| next | 16.2.12 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | scaffold (`pnpm create next-app`) | framework |
| react / react-dom | 19.2.8 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | scaffold | UI |
| drizzle-orm | 0.45.2 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | ORM |
| @neondatabase/serverless | 1.1.0 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | driver Postgres serverless para Neon |
| zod | 4.4.3 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | validación en cada borde |
| react-hook-form | 7.83.0 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | formularios |
| @tanstack/react-query | 5.101.4 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | polling del dashboard |
| better-auth | 1.6.25 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | auth admin |
| qrcode | 1.5.4 | https://registry.npmjs.org/qrcode | 2026-09-17 | §10 Bootstrap | generación de PNG del QR |
| html5-qrcode | 2.3.8 | https://registry.npmjs.org/html5-qrcode | 2026-09-17 | §10 Bootstrap | escaneo por cámara en el navegador |
| html-to-image | 1.11.13 | https://registry.npmjs.org/html-to-image | 2026-09-17 | §10 Bootstrap | captura de la tarjeta del ticket a PNG |
| dotenv | 17.x | `knowledge/runtime-tracks/ts-node.md` (línea LTS del ecosistema, no listado explícito en el track) — UNVERIFIED, verify before install | 2026-09-17 | §10 Bootstrap | carga de `.env` en scripts/CLIs standalone (`drizzle.config.ts`, `scripts/*.ts`) |

### Development

| Package | Version | Source | Checked | Installed by | Purpose |
|---|---|---|---|---|---|
| typescript | ~6.0.3 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | pin explícito sobre el `^5` del scaffold |
| @biomejs/biome | 2.5.5 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | lint + format |
| drizzle-kit | 0.31.10 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | CLI de migraciones |
| vitest | 4.1.10 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | unit tests |
| @playwright/test | 1.62.0 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | e2e + a11y |
| @vitejs/plugin-react | 6.0.4 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | vitest resuelve JSX/TSX |
| @types/qrcode | 1.5.6 | https://registry.npmjs.org/@types/qrcode | 2026-09-17 | §10 Bootstrap | tipos de `qrcode` |
| tsx | 4.23.1 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap | ejecutar `scripts/*.ts` |
| @axe-core/playwright | ^4 — UNVERIFIED, verify before install | no consultado en vivo esta sesión | 2026-09-17 | §10 Bootstrap (paso 12) | scan de accesibilidad automatizado |
| shadcn (CLI) | 4.16.0 | `knowledge/runtime-tracks/ts-node.md` | 2026-07-27 | §10 Bootstrap (`pnpm dlx`, no queda como dependencia) | copia de componentes UI |

### Deliberately not used

| Rejected | Instead | Why |
|---|---|---|
| Prisma | Drizzle | el `UPDATE ... WHERE status='issued'` atómico se escribe directo en SQL-shape sin pelear con un cliente generado |
| ESLint + Prettier | Biome | una sola herramienta, ya viene con `--biome` del scaffold |
| WebSockets / Pusher / Supabase Realtime | Polling (~5s) con TanStack Query | el contador del dashboard no necesita latencia sub-segundo para <250 personas |
| Auth social/SSO para el personal | CIP+DNI como credencial de un solo uso | el personal no necesita ni quiere crear una cuenta para un evento de un día |
| Node crypto propio para hash de código de estación | el hasher que ya trae Better Auth como dependencia (scrypt/argon2 según su versión pinneada) | evita una segunda librería de hashing en el proyecto |

---

## 12. Deployment Strategy

### Hosting

Vercel, plan Hobby o Pro según el dominio institucional. Build command: `pnpm build` (detectado
automáticamente por el framework preset de Next.js). Output: manejado por el adapter de Vercel
(`.next` estándar, sin `output: "standalone"` — no hace falta self-host). Runtime: Node 24 (Vercel
Functions).

### Environments

| Environment | Branch | URL | Database | Third-party mode |
|---|---|---|---|---|
| Local | — | localhost:3000 | Neon branch de dev, o local vía `TEST_DATABASE_URL` para tests | claves de prueba |
| Preview | cualquier PR | auto-generada por Vercel | branch de Neon por PR | claves de prueba |
| Production | `main` | dominio institucional | Neon rama principal | claves reales |

### CI/CD

`.github/workflows/ci.yml` (paso 13): en cada push, `pnpm install --frozen-lockfile` →
`pnpm exec tsc --noEmit` → `pnpm exec biome check .` → `pnpm exec vitest run` → `pnpm build`. Es el
mismo set que corre §20.1 — si un check está en el gate, está en CI, sin excepciones.

### Release and rollback

Deploy vía integración Git de Vercel (push a `main` → deploy automático). Rollback: "Promote to
Production" sobre un deploy anterior desde el dashboard de Vercel — instantáneo, sin rebuild.
Migraciones: se aplican como paso explícito (`pnpm exec drizzle-kit migrate` contra `DATABASE_URL`
de producción) antes del deploy del código que las asume, nunca en el boot de la app — con una sola
instancia serverless por request no hay riesgo real de instancias concurrentes corriendo migraciones
a la vez, pero la disciplina se mantiene igual.

### Domain, DNS, TLS

Subdominio del dominio institucional (ej. `boletos.institucion.pe`) apuntado a Vercel vía CNAME;
TLS gestionado automáticamente por Vercel. Sin redirect apex↔www — un solo subdominio dedicado.

---

## 13. Testing Strategy

De `knowledge/capabilities/testing.md`. Los tests existen para que las condiciones "Done when" de
la Sección 9 sean verificables.

| Layer | Framework | What it covers | Where | Runs |
|---|---|---|---|---|
| Unit | Vitest | lógica pura y contra Postgres real de test (schemas, tickets, verify, rate-limit, stations, stats, export) | `tests/**/*.test.ts` | cada commit |
| E2E / a11y | Playwright + `@axe-core/playwright` | accesibilidad de las 3 pantallas públicas críticas | `tests/e2e/*.spec.ts` | pre-deploy y en CI |

### Critical flows to cover E2E

1. Registro → QR → descarga → re-búsqueda (cubierto por la suite unit de `server/tickets`,
   `lib/qr-token`, `server/ticket-downloads`, `server/rate-limit` contra Postgres real — no necesita
   navegador porque no hay lógica de UI compleja, es formularios simples).
2. Verificación concurrente anti-doble-uso (`tests/server/verify-concurrency.test.ts` — 10 requests
   simultáneas contra el mismo ticket).
3. Accesibilidad de `/registro`, `/mi-ticket`, `/verificar` (`tests/e2e/accessibility.spec.ts`).

### Test data

`docker-compose.yml` (§19.6) levanta un Postgres local en el puerto 5433, apuntado por
`TEST_DATABASE_URL`. Cada test file limpia las tablas que usa al inicio (nunca al final, para poder
inspeccionar un fallo) — nunca comparten estado mutable entre tests ni dependen del orden de
ejecución. Nunca se usa `DATABASE_URL` (Neon real) en un test.

### What is deliberately not tested

Rendimiento bajo carga (>250 personas simultáneas) — el evento tiene un techo conocido y bajo, no se
justifica una suite de carga. Compatibilidad con navegadores fuera de Chrome/Safari/Firefox
modernos — el staff de estación usa celulares provistos por la institución, no un público abierto.

---

## 14. Security & Secrets

| Concern | Control | Implemented in |
|---|---|---|
| Secret storage | variables de entorno de Vercel, nunca en el repo | `.env.example` como plantilla, `.gitignore` excluye `.env*` |
| Secret rotation | rotar `QR_HMAC_SECRET` invalida TODOS los QR emitidos — solo se rota entre eventos, nunca durante uno | operacional, documentado en §20.2 |
| Input validation | `zod` en cada server action y route handler | `src/lib/schemas.ts` |
| Output encoding / XSS | escape automático de React/Next.js; sin `dangerouslySetInnerHTML` en el proyecto | todo `src/app/**`, `src/components/**` |
| SQL injection | Drizzle parametriza cada query — cero SQL armado con concatenación de strings | `src/server/**`, `src/db/**` |
| AuthN / AuthZ | ver §8 — verificado server-side en cada request | `src/proxy.ts`, cada route handler |
| CSRF | Server Actions de Next.js (protección nativa) + route handlers que exigen mismo origen | `src/app/**/actions.ts` |
| Rate limiting / abuso | 5 fallos/hora por `cip` en `/mi-ticket` | `src/server/rate-limit.ts` |
| Webhook verification | NOT APPLICABLE — el sistema no recibe webhooks de terceros | — |
| Dependency audit | `pnpm audit`, corrido manualmente antes del deploy final (no automatizado en CI para un proyecto de un solo release) | operacional |
| Security headers | CSP por defecto de Next.js + `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` vía `next.config.ts` `headers()` | `next.config.ts` |
| PII handling | `dni`/`cip` se almacenan (necesarios para la validación), nunca se loguean; retención: los datos viven mientras el evento sea relevante, sin borrado automatizado en v1 | `src/lib/env.ts` (nunca loguea secretos), no hay logger que imprima campos PII |
| Logging hygiene | nunca loguear `dni`, `cip`, ni el contenido crudo del token QR | regla en `CLAUDE.md` non-negotiable #2 |

**Hard rules**
- Ningún secreto se commitea, se imprime en un log, se envía a un error tracker, o se embebe en el
  bundle de cliente.
- Toda verificación de autorización server-side corre antes del trabajo, nunca después.
- No hay webhooks de terceros en este sistema; si se agregaran en el futuro, se verificarían por
  firma antes de parsear el body como confiable.

Este proyecto maneja DNI (documento de identidad) del personal — dato personal sensible bajo
regímenes de protección de datos personales aplicables en Perú. Obligación concreta para este build:
`dni` y `cip` nunca aparecen en logs, nunca se envían a un servicio de terceros (no hay analytics ni
error tracker externo en v1 — ver §16), y el acceso de lectura queda limitado a lo que cada flujo
necesita (el admin ve la tabla completa; el personal solo ve/valida su propia fila).

---

## 15. Accessibility

**Target: WCAG 2.2 Level AA.**

### Baseline requirements

| Requirement | Rule |
|---|---|
| Semantic HTML | landmarks, un `h1` por página, encabezados en orden, listas para listas |
| Keyboard | todo elemento interactivo alcanzable por teclado, orden de tab lógico, sin trampas |
| Focus visible | anillo de foco dorado (`--color-primary`) de 2-4px, ≥3:1 contra el fondo |
| Contrast | texto 4.5:1, texto grande/bordes de UI 3:1 — ver §7 |
| Forms | cada input con label programático; errores como texto, nunca solo color |
| Images | el QR lleva `alt="Código QR del ticket de {nombre}"`; íconos decorativos `alt=""` |
| Motion | todo lo animado respeta `prefers-reduced-motion: reduce` |
| Zoom / reflow | usable a 200% zoom y a 320px de ancho sin scroll horizontal |
| Live regions | el contador del dashboard usa `aria-live="polite"` para anunciar cambios |

### WCAG 2.2 additions

| SC | Requirement |
|---|---|
| 2.4.11 Focus Not Obscured | el foco nunca queda oculto tras un header sticky o un toast |
| 2.5.8 Target Size (Min) | botones de `/registro`/`/mi-ticket`/`/verificar` ≥56px — supera el mínimo de 24px |
| 3.3.7 Redundant Entry | el nombre elegido en la búsqueda de `/registro` se reutiliza, nunca se retipea |
| 3.3.8 Accessible Authentication | CIP+DNI se pueden pegar (paste habilitado), sin captcha ni prueba cognitiva |

### Verification

```bash
pnpm exec playwright test tests/e2e/accessibility.spec.ts   # expect: 0 violaciones de axe
```

Pases manuales antes del lanzamiento: recorrido solo-teclado de `/registro` y `/verificar`, un pase
de lector de pantalla sobre `/registro`, y un pase a 200% de zoom en el breakpoint más angosto.

---

## 16. Observability & Cost

### Instrumentation

| Signal | Tool | What it captures | Who looks at it |
|---|---|---|---|
| Errores | Vercel's built-in Function Logs | excepciones no manejadas en route handlers/server actions | admin técnico |
| Logs | `console.error` estructurado (JSON) en cada error de servidor, sin PII | Vercel Logs | admin técnico |
| Métricas | Vercel Analytics (built-in, sin dependencia extra) | tráfico y latencia de `/registro`, `/api/verify` | admin técnico |
| Uptime | `GET /api/health` sondeado manualmente el día del evento (sin servicio externo en v1) | conectividad real a Postgres | staff en el local |

Se elige NO agregar Sentry/Datadog en v1: el evento dura unas horas y el costo/complejidad de un
proveedor externo de observabilidad no se justifica frente a los logs nativos de Vercel — documentado
como decisión en §20.3.

### The metrics that matter for this project

| Metric | Target | Alert at |
|---|---|---|
| p95 latencia de `/api/verify` | < 500ms | > 2s sostenido |
| Tasa de error de `/api/verify` | 0% | > 1% de requests en 5 min |
| Tickets verificados / tickets emitidos | seguimiento informativo, sin umbral de alerta | — |

### Health check

`GET /api/health` corre `SELECT 1` contra `DATABASE_URL` real, no solo devuelve 200 — un 200 sin
consulta a la base no prueba que el sistema pueda atender el día del evento. Sondeado manualmente
antes del evento por el admin (no hay pooler de uptime externo en v1).

### Cost model

| Service | Free tier | Cost at v1 scale (<250 personas, evento de 1 día) | Cost at 10× | Cliff to watch |
|---|---|---|---|---|
| Vercel Hobby/Pro | Hobby cubre el tráfico esperado | $0 (Hobby) | $20/mes (Pro, si se necesita dominio custom con SLA) | límite de invocaciones de Functions en Hobby |
| Neon | Free tier: 0.5 GB, cómputo compartido | $0 | $0-19/mes | cómputo dedicado si el evento crece a miles |

**Costo mensual estimado en el lanzamiento: $0.** El evento es de un día y el volumen (<250 filas,
tráfico de unas horas) cabe cómodo en los free tiers de Vercel y Neon. La palanca más barata si algo
escala es simplemente esperar — no hay línea de costo que crezca superlinealmente con el uso en este
sistema.

---

## 17. Model Routing

NOT APPLICABLE — this project does not call an LLM at runtime.

---

## 18. Skills to Use During Build

| Skill | Build steps | Why | Install |
|---|---|---|---|
| `ui-ux-pro-max` | 12 | refinar la aplicación del sistema de diseño (§7) sobre los componentes shadcn ya copiados | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` |

Ningún otro skill de `knowledge/skills-registry.md` aplica a este build — es CRUD + un algoritmo de
concurrencia + un dashboard, sin necesidad de investigación web, lectura de sitios de referencia, ni
generación de PDF/Office. Si `ui-ux-pro-max` no está disponible en la máquina del builder, el paso
12 se completa igual con los tokens literales ya fijados en §7/`CLAUDE.md` — se anota el fallback en
una línea y se continúa.

---

## 19. Agent Workspace

`workspace/` ya está en el bundle, con el layout exacto de abajo — se copia **una vez** al root del
proyecto con la línea guardada de §10's Bootstrap (`rsync -a --ignore-existing workspace/ ./`), que
es segura de re-correr.

```
./blueprints/boleteria-qr/workspace/
├── CLAUDE.md
├── AGENTS.md
├── docker-compose.yml
├── .env.example
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tests/setup.ts
├── tests/stubs/server-only.ts
└── .claude/
    ├── settings.json
    ├── skills/add-migration/SKILL.md
    ├── skills/add-api-route/SKILL.md
    └── rules/{database,verification,styling}.md
```

**Archivos deliberadamente NO overwriteados por la copia**, una vez que algo los instaló:
`package.json` y `pnpm-lock.yaml` — no viven bajo `workspace/` en absoluto (los genera el scaffold,
ver *Who authors the package manifest* abajo), así que `rsync --ignore-existing` nunca los toca.

### 19.1 `CLAUDE.md`

Emitido como archivo real en `workspace/CLAUDE.md` — ver el archivo en el bundle. 96 líneas, bajo el
límite de 200, con la tabla de comandos primero.

### 19.2 `AGENTS.md`

Emitido como archivo real en `workspace/AGENTS.md` — stub tool-neutral de 22 líneas que apunta a
`CLAUDE.md`.

### 19.3 `.claude/settings.json`

Emitido como archivo real en `workspace/.claude/settings.json` — cubre cada comando de `Verify` de
la Sección 9 (`pnpm install`, `tsc`, `biome check`, `vitest run`, `playwright test`,
`drizzle-kit generate/migrate/studio`, los scripts de seed/import, `@better-auth/cli`,
`pnpm approve-builds`, `shadcn`, `corepack`, `docker compose`, y los comandos de git/curl que usan
los checkpoints y health checks) más las denegaciones de lectura de `.env` y push/destructivos.

### 19.4 Project skills — `.claude/skills/<name>/SKILL.md`

| Skill | Triggers on | What it automates |
|---|---|---|
| `add-migration` | "necesito cambiar el esquema", editar `src/db/schema.ts` | generar, revisar y aplicar una migración de Drizzle sin nombrar el archivo a mano |
| `add-api-route` | "agregar un endpoint", nueva ruta bajo `src/app/api/` | el patrón de validación zod → server logic → envelope tipado → test |

Emitidos como archivos reales bajo `workspace/.claude/skills/`.

### 19.5 `.claude/rules/*.md`

| File | `paths` globs | Covers |
|---|---|---|
| `.claude/rules/database.md` | `src/db/**`, `drizzle/**`, `drizzle.config.ts` | convenciones de esquema y migración |
| `.claude/rules/verification.md` | `src/server/verify.ts`, `src/app/api/verify/**` | el `UPDATE` atómico anti-doble-uso |
| `.claude/rules/styling.md` | `src/app/**/*.tsx`, `src/components/**` | tokens de diseño y accesibilidad |

Emitidos como archivos reales bajo `workspace/.claude/rules/`.

### 19.6 Verify-critical config and local infrastructure

| File | Path in the project | Which `Verify` commands need it | Resolution/env handling it carries | Bundle-path exclusion |
|---|---|---|---|---|
| `docker-compose.yml` | `./docker-compose.yml` | pasos 1-13 (todo test contra `TEST_DATABASE_URL`) | n/a — no lee env, define el servicio | n/a — no camina el árbol del proyecto |
| `.env.example` | `./.env.example` | ninguno directamente; provee los valores locales que Bootstrap copia a `.env` | n/a | n/a |
| `drizzle.config.ts` | `./drizzle.config.ts` | `drizzle-kit generate`/`migrate`/`studio` en cada paso que toca el esquema | `import "dotenv/config"` explícito — es un CLI standalone, Next.js no lo bootea | `exclude` de `tsc` cubre `blueprints/`; este archivo vive en la raíz, no dentro del bundle |
| `vitest.config.ts` | `./vitest.config.ts` | todo `pnpm exec vitest run tests/**` | alias `@` (espeja `tsconfig.json`) + alias `server-only` → `tests/stubs/server-only.ts`, porque el guard de Next.js revienta fuera de su propio bundler | `test.exclude` incluye `blueprints/**` |
| `playwright.config.ts` | `./playwright.config.ts` | `pnpm exec playwright test tests/e2e/**` | `webServer` corre `pnpm build && pnpm start` — carga env vía el propio Next.js, que sí lee `.env` en boot | `testIgnore: ["**/blueprints/**"]` |
| `tests/setup.ts` | `./tests/setup.ts` | todo test de vitest (vía `setupFiles`) | confirma `TEST_DATABASE_URL` presente antes de correr nada | n/a |
| `tests/stubs/server-only.ts` | `./tests/stubs/server-only.ts` | cualquier test que importe transitivamente un módulo de `src/server/**` (todos, porque `server/tickets.ts` en adelante importa `"server-only"`) | stub vacío | n/a |

That last row is the one that fails silently. Every path referenced in a `Verify` command across
`blueprint.md` §9, `tasks.json`, and both epic files is authored either by a numbered step's
`files[]` or by this table — cross-checked manually while writing §9 and confirmed again in the
self-audit below.

#### A resolution convention is decided once and reconciled against every loader

**La convención, una sola vez:** especificadores relativos `.ts` (nunca `.js`), habilitados por
`allowImportingTsExtensions` + `rewriteRelativeImportExtensions` en `tsconfig.json` — exactamente
la convención documentada en `knowledge/runtime-tracks/ts-node.md`, "Module resolution — decided
once, for every loader".

| Context | Command that exercises it | Convention as it appears there | Config + literal setting that makes it work |
|---|---|---|---|
| Application source | `pnpm dev` / `pnpm build` | `import { db } from "@/db/client"` (alias) o `./client.ts` relativo | `tsconfig.json` — `paths: {"@/*": ["./src/*"]}` (generado por el scaffold con `--src-dir`) + las dos flags de arriba |
| Test files | `pnpm exec vitest run` | mismo alias `@/*` | `vitest.config.ts` — `resolve.alias["@"]` apunta a `./src` |
| Standalone scripts | `pnpm exec tsx scripts/import-personnel.ts` | especificadores relativos `.ts` | `tsx` respeta `allowImportingTsExtensions` de `tsconfig.json` de forma nativa; sin flag adicional |
| Build / bundle | `pnpm build` | igual que Application source | Next.js resuelve `.ts` vía su propio compilador, coincide con `tsconfig.json` |

#### Cross-artifact value reconciliation

| Shared value | Single source | Literal value | Every other place it appears | Compared |
|---|---|---|---|---|
| Puerto de Postgres de test | `docker-compose.yml` — `ports` | `5433:5432` | `.env.example` (`TEST_DATABASE_URL=...localhost:5433/...`) | yes |
| Nombre de la app / paquete | `package.json` (generado por el scaffold) — `name` | `boleteria-qr` | `.github/workflows/ci.yml` (job name, no un valor comparado) | yes |
| Puerto de la app | `next.config.ts` (default de Next.js) | `3000` | `playwright.config.ts` (`baseURL`, `webServer.url`), `CLAUDE.md` (tabla de comandos) | yes |
| Ruta de salida del build | Next.js default (`.next/`) | `.next/` | `.gitignore` (excluida), no referenciada por ningún `Verify` explícitamente — Vercel lo detecta automáticamente | yes |

#### Byte-exact artifact reconciliation

NOT APPLICABLE — this blueprint authors no byte-exact expected output. Ningún paso compara bytes
literales de un archivo generado contra un golden file; toda aserción de "Verify" es sobre
comportamiento (status HTTP, conteos de filas, exit codes), no sobre contenido byte-a-byte.

---

## 20. Acceptance Gate, Risks & Decision Log

### 20.1 Global acceptance gate

El proyecto está **terminado** cuando cada comando de abajo sale con 0 en un checkout limpio, y no
antes. Es el mismo set que corre CI (§12) y el mismo contra el que se mide cada paso de la Sección 9.

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit             # expect: exit 0, cero errores
pnpm exec biome check .            # expect: exit 0, cero errores y cero warnings
pnpm exec vitest run               # expect: exit 0, 0 failed, 0 skipped
pnpm build                         # expect: exit 0
pnpm start &                       # arranca el build de producción
sleep 2
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)" = 200
test "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/health)" = 200
kill %1
pnpm exec playwright test tests/e2e/accessibility.spec.ts   # expect: 0 violaciones
```

Cada línea sale con 0 en un build correcto (§9 regla 11) y está expresada como propiedad, no como
conteo mágico (§9 regla 10) — "cada tabla que §4 define existe" en vez de un número de tablas fijo.

Además, estos gates manuales, cada uno chequeado una vez antes del lanzamiento:

- [ ] Cada paso de §9 tiene su tag de checkpoint en git (`git tag -l 'step-*'` lista las 13, de
      `step-01-scaffold` a `step-13-ci-deploy-readiness`). El repositorio existe desde el Bootstrap
      de §10, no desde un scaffolder.
- [ ] Cada archivo de la tabla "Files that must be committed" de §10 está presente en un checkout
      limpio (`git ls-files --error-unmatch <path>` sale con 0 para cada uno, una invocación por
      archivo) y ningún patrón de ignore lo traga
      (`git check-ignore -q <path>; test $? -eq 1` para cada uno).
- [ ] El `.gitignore` con la excepción de `.env.example` está en el commit de Bootstrap, no en un
      paso posterior de §9 (`git log --diff-filter=A --format=%H -- .gitignore` apunta al commit de
      `chore: scaffold`).
- [ ] §10's Bootstrap se re-corrió una vez sobre un árbol ya bootstrapeado, **salió con 0**, y no
      cambió nada importante: `package.json` sigue listando todas las dependencias instaladas y el
      siguiente comando sigue encontrando sus binarios.
- [ ] Cada fila de la tabla *Cross-artifact value reconciliation* de §19.6 dice `Compared: yes`, y
      los gates de lint/format/typecheck de arriba se corrieron desde la raíz del proyecto **con el
      bundle presente** — las exclusiones de §19.6 son lo que evita que los configs del propio
      bundle rompan esos gates.
- [ ] Cada non-goal de §1 sigue sin construirse.
- [ ] Cada variable de entorno de §10 está seteada en producción y ausente del repo.
- [ ] El flujo E2E crítico (verificación concurrente, `tests/server/verify-concurrency.test.ts`)
      pasó contra la URL de producción una vez, manualmente, antes del evento.
- [ ] Pase solo-teclado y un pase de lector de pantalla sobre `/registro` (§15).
- [ ] Un rollback se ejecutó una vez, a propósito, en un ambiente preview (§12).

**No se ignoran warnings.** Un warning tolerado se vuelve permanente, y el próximo real se esconde
adentro.

### 20.2 Risk register

| Risk | Likelihood | Impact | Early signal | Mitigation |
|---|---|---|---|---|
| Doble escaneo casi simultáneo en 6-8 estaciones al mismo QR | M | H | dos respuestas "verificado exitoso" para el mismo ticket en los logs | `UPDATE ... WHERE status='issued'` atómico en una transacción (paso 9), nunca leer-luego-escribir; test de concurrencia con 10 requests simultáneas es parte del gate del paso |
| Alguien con acceso al CIP+DNI de otra persona descarga/reutiliza su ticket — CIP+DNI son una credencial débil | M | M | picos de descarga o de intentos fallidos de un mismo `cip` en `ticket_download_log`/`ticket_search_attempt` | riesgo aceptado, no eliminable por software: rate limiting en la búsqueda (paso 7) + log de descargas con IP para auditoría posterior (paso 6) + control operativo — el staff de puerta compara el nombre en pantalla tras el escaneo con la persona física |
| Dependencia de conectividad a internet en el local del evento (Vercel + Neon son remotos) | M | H | latencia alta o timeouts en `/api/verify` el día del evento | riesgo aceptado para v1; el local debe tener wifi/datos móviles confiables — no se construye modo offline (ver Non-Goals) |
| El admin sube un CSV con errores (nombres duplicados, CIP repetido) horas antes del evento | M | H | el import falla con un reporte de filas rechazadas | validación estricta al importar — CIP y DNI únicos dentro del archivo, todos los campos requeridos, reporte claro de fila+motivo antes de sobrescribir `personnel` (paso 2) |
| `QR_HMAC_SECRET` se pierde o se rota accidentalmente entre el registro y el evento | B | H | todos los QR emitidos antes de la rotación dejan de verificar | el secreto se genera una sola vez en el setup inicial y se guarda en el vault de variables de Vercel; nunca se rota entre el cierre del registro y el evento |
| Neon free tier alcanza un límite de cómputo/almacenamiento el día del evento por un pico de tráfico | B | M | latencia elevada visible en Vercel Analytics | el volumen (<250 personas, unas horas) está muy por debajo del free tier; si se observa degradación, upgrade a un plan de cómputo dedicado es una operación de minutos, no de código |

### 20.3 Decision log

| # | Decision | Rejected alternative | Why | Would reverse if |
|---|---|---|---|---|
| 1 | Postgres (Neon) + Drizzle | Prisma | control directo del SQL para el `UPDATE` atómico, sin pelear con abstracciones de transacción de un ORM generado | si el equipo necesitara un Studio/GUI más pulido y el control fino del SQL dejara de importar |
| 2 | Better Auth para admin, código propio para estaciones | Una sola cuenta compartida por estación en Better Auth | una estación es un dispositivo, no una persona; una cuenta por estación es sobre-ingeniería para 6-8 dispositivos de un solo evento | si el sistema pasa a ser recurrente y las estaciones necesitan auditoría por operador individual |
| 3 | Polling ~5s con TanStack Query | WebSockets / Supabase Realtime | <250 personas y un evento de horas no justifican mantener conexiones abiertas | si el evento crece a miles de personas o se necesita latencia sub-segundo en el contador |
| 4 | HMAC firmado (no JWT) para el token del QR | JWT con `jsonwebtoken` | el payload es solo un ticket id — un JWT completo (headers, claims, exp) es peso muerto para algo que solo necesita "¿esto lo firmé yo?" | si el token necesitara llevar claims adicionales verificables (roles, expiración por evento) |
| 5 | Sin observabilidad externa (Sentry/Datadog) en v1 | Sentry | los logs nativos de Vercel bastan para un evento de horas; el costo/setup de un proveedor externo no se justifica | si el sistema pasa a usarse para múltiples eventos al año y necesita alertas proactivas |

### 20.4 What to build next

1. Edición fila-por-fila del listado de personal desde la UI — si el sistema se vuelve recurrente y
   el listado necesita mantenerse vivo entre eventos.
2. Pagos integrados — si la institución empieza a cobrar el evento y necesita conciliar
   automáticamente contra `pagado`.
3. Modo offline de verificación — si el local del evento no puede garantizar conectividad confiable.
4. Notificaciones por correo con el ticket adjunto — si se decide reducir la fricción de "buscar mi
   ticket" para quienes cierran la pestaña sin descargar.
5. Soporte multi-evento — si la institución decide reusar el sistema para un segundo evento.

---

*End of blueprint. Build order is §9. Stop when §20.1 is green.*
