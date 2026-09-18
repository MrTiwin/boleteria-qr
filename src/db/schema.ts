import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Every table: id uuid primary key default gen_random_uuid(), created_at timestamptz not null
// default now() — see .claude/rules/database.md.

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
