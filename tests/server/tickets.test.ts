import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { lookupAttempt, personnel, ticket } from "@/db/schema";
import { registerByCredentials } from "@/server/tickets";

const PERSON = {
  grado: "Mayor",
  apellidos: "Gomez Perez",
  nombres: "Juan",
  cip: "123456",
  dni: "87654321",
  pagado: true,
};

beforeEach(async () => {
  await db.execute(sql`delete from ${ticket}`);
  await db.execute(sql`delete from ${personnel}`);
  await db.execute(sql`delete from ${lookupAttempt}`);
  await db.insert(personnel).values(PERSON);
});

describe("registerByCredentials", () => {
  it("creates exactly one ticket for a valid cip+dni with consent checked", async () => {
    const result = await registerByCredentials({
      cip: PERSON.cip,
      dni: PERSON.dni,
      consent: true,
    });

    expect(result.ok).toBe(true);
    const rows = await db.select().from(ticket);
    expect(rows).toHaveLength(1);
  });

  it("returns the existing ticket on a second submission instead of creating a duplicate", async () => {
    const first = await registerByCredentials({
      cip: PERSON.cip,
      dni: PERSON.dni,
      consent: true,
    });
    const second = await registerByCredentials({
      cip: PERSON.cip,
      dni: PERSON.dni,
      consent: true,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.data.ticketId).toBe(first.data.ticketId);
    }

    const rows = await db.select().from(ticket);
    expect(rows).toHaveLength(1);
  });

  it("rejects when cip matches but dni does not, and creates no ticket", async () => {
    const result = await registerByCredentials({
      cip: PERSON.cip,
      dni: "00000000",
      consent: true,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_CREDENTIALS", message: expect.any(String) },
    });
    const rows = await db.select().from(ticket);
    expect(rows).toHaveLength(0);
  });

  it("rejects when consent is not checked", async () => {
    const result = await registerByCredentials({
      cip: PERSON.cip,
      dni: PERSON.dni,
      consent: false,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "CONSENT_REQUIRED", message: expect.any(String) },
    });
    const rows = await db.select().from(ticket);
    expect(rows).toHaveLength(0);
  });

  it("rejects registration for a valid cip+dni when pagado is false, and creates no ticket", async () => {
    await db
      .update(personnel)
      .set({ pagado: false })
      .where(eq(personnel.cip, PERSON.cip));

    const result = await registerByCredentials({
      cip: PERSON.cip,
      dni: PERSON.dni,
      consent: true,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "PAYMENT_REQUIRED", message: expect.any(String) },
    });
    const rows = await db.select().from(ticket);
    expect(rows).toHaveLength(0);
  });

  it("rate-limits repeated wrong-dni attempts for the same cip, same as /mi-ticket", async () => {
    for (let i = 0; i < 5; i++) {
      await registerByCredentials({
        cip: PERSON.cip,
        dni: "00000000",
        consent: true,
      });
    }

    const result = await registerByCredentials({
      cip: PERSON.cip,
      dni: PERSON.dni, // even the correct dni is rejected once rate-limited
      consent: true,
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "RATE_LIMITED", message: expect.any(String) },
    });
    const rows = await db.select().from(ticket);
    expect(rows).toHaveLength(0);
  });
});
