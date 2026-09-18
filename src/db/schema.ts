import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Every table: id uuid primary key default gen_random_uuid(), created_at timestamptz not null
// default now() — see .claude/rules/database.md. Exception: the four Better Auth tables below,
// which use Better Auth's own text-id generation because they are adapter-managed, not
// hand-written — see src/lib/auth.ts, the only file that reads or writes them directly.

// "admin" manages stations and personnel; "anfitrion" is read-only on the dashboard — see
// src/proxy.ts for where the split is enforced.
export const userRole = pgEnum("user_role", ["admin", "anfitrion"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verificationToken = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const personnel = pgTable("personnel", {
  id: uuid("id").primaryKey().defaultRandom(),
  grado: text("grado").notNull(),
  apellidos: text("apellidos").notNull(),
  nombres: text("nombres").notNull(),
  cip: text("cip").notNull().unique(),
  dni: text("dni").notNull().unique(),
  pagado: boolean("pagado").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ticket = pgTable("ticket", {
  id: uuid("id").primaryKey().defaultRandom(),
  personnelId: uuid("personnel_id")
    .notNull()
    .unique()
    .references(() => personnel.id),
  qrToken: text("qr_token").notNull(),
  status: text("status", { enum: ["issued", "verified"] })
    .notNull()
    .default("issued"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedByStation: uuid("verified_by_station").references(
    () => verificationStation.id,
  ),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verificationStation = pgTable("verification_station", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  codeHash: text("code_hash").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Append-only audit trail for the CIP+DNI weak-credential risk — see the blueprint's risk
// register. Never delete or update a row here.
export const ticketDownloadLog = pgTable("ticket_download_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id")
    .notNull()
    .references(() => ticket.id),
  ip: text("ip").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One row per failed "buscar mi ticket" attempt — a successful lookup never writes here. Read by
// src/server/rate-limit.ts with a one-hour window; see CLAUDE.md's rate-limiting note.
export const lookupAttempt = pgTable("lookup_attempt", {
  id: uuid("id").primaryKey().defaultRandom(),
  cip: text("cip").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
