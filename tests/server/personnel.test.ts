import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { personnel, ticket } from "@/db/schema";
import { createPersonnel } from "@/server/personnel";

const NEW_PERSON = {
  grado: "CAP",
  apellidos: "PEREZ LOPEZ",
  nombres: "ANA",
  cip: "127000001",
  dni: "12345678",
  pagado: false,
};

beforeEach(async () => {
  await db.execute(sql`delete from ${ticket}`);
  await db.execute(sql`delete from ${personnel}`);
});

describe("createPersonnel", () => {
  it("inserts a new person and returns their id", async () => {
    const result = await createPersonnel(NEW_PERSON);

    expect(result.ok).toBe(true);
    expect(await db.select().from(personnel)).toHaveLength(1);
  });

  it("rejects a cip that already belongs to someone else", async () => {
    await createPersonnel(NEW_PERSON);

    const result = await createPersonnel({ ...NEW_PERSON, dni: "87654321" });

    expect(result).toEqual({
      ok: false,
      error: { code: "CIP_TAKEN", message: expect.any(String) },
    });
    expect(await db.select().from(personnel)).toHaveLength(1);
  });

  it("rejects a dni that already belongs to someone else", async () => {
    await createPersonnel(NEW_PERSON);

    const result = await createPersonnel({ ...NEW_PERSON, cip: "127000002" });

    expect(result).toEqual({
      ok: false,
      error: { code: "DNI_TAKEN", message: expect.any(String) },
    });
  });
});
