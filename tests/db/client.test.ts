import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { personnel, ticket } from "@/db/schema";

describe("db client", () => {
  it("returns typed rows with no any", async () => {
    // ticket.personnel_id references personnel — clear the dependent table first, or a run that
    // executes after any test suite that created tickets fails on the FK constraint.
    await db.execute(sql`delete from ${ticket}`);
    await db.execute(sql`delete from ${personnel}`);
    const rows = await db.select().from(personnel);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(0);
  });
});

describe("env", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    vi.resetModules();
  });

  it("throws a named MissingEnvError when DATABASE_URL is absent at import time", async () => {
    process.env.DATABASE_URL = "";
    await expect(async () => {
      await import("@/lib/env");
    }).rejects.toMatchObject({ name: "MissingEnvError" });
  });
});
