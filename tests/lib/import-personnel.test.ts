import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { personnel, ticket } from "@/db/schema";
import { importPersonnel } from "@/lib/import-personnel";

const HEADER = "grado,apellidos,nombres,cip,dni,pagado";

describe("importPersonnel — validation (no DB write on failure)", () => {
  it("rejects a row missing a required field, reporting the row number and field name", async () => {
    const csv = `${HEADER}\nMayor,Gomez Perez,Juan,123456,,SI`;
    const result = await importPersonnel(csv);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({ row: 2, field: "dni" }),
      );
    }
  });

  it("rejects two rows sharing the same cip, reporting both row numbers", async () => {
    const csv = [
      HEADER,
      "Mayor,Gomez Perez,Juan,123456,87654321,SI",
      "Capitan,Torres Vega,Ana,123456,76543210,NO",
    ].join("\n");
    const result = await importPersonnel(csv);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dupError = result.errors.find((e) => e.field === "cip");
      expect(dupError).toBeDefined();
      expect(dupError?.row).toBe(2);
      expect(dupError?.message).toContain("3");
    }
  });

  it("rejects two rows sharing the same dni, reporting both row numbers", async () => {
    const csv = [
      HEADER,
      "Mayor,Gomez Perez,Juan,123456,87654321,SI",
      "Capitan,Torres Vega,Ana,234567,87654321,NO",
    ].join("\n");
    const result = await importPersonnel(csv);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dupError = result.errors.find((e) => e.field === "dni");
      expect(dupError).toBeDefined();
      expect(dupError?.row).toBe(2);
      expect(dupError?.message).toContain("3");
    }
  });
});

describe("importPersonnel — clean import (touches TEST_DATABASE_URL)", () => {
  it("replaces the personnel table contents inside one transaction", async () => {
    // ticket.personnel_id references personnel — clear the dependent table first, or this
    // fails on the FK constraint once any earlier-run test file left a ticket row behind
    // (test files now run serialized against one shared database — see vitest.config.ts).
    await db.execute(sql`delete from ${ticket}`);
    await db.execute(sql`delete from ${personnel}`);
    const csv = [
      HEADER,
      "Mayor,Gomez Perez,Juan,123456,87654321,SI",
      "Capitan,Torres Vega,Ana,234567,76543210,NO",
    ].join("\n");

    const result = await importPersonnel(csv);

    expect(result).toEqual({ ok: true, count: 2 });
    const rows = await db.select().from(personnel);
    expect(rows).toHaveLength(2);
  });
});
