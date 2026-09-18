import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { lookupAttempt, personnel, ticket } from "@/db/schema";
import { lookupTicketByCredentials } from "@/server/rate-limit";
import { createOrGetTicket } from "@/server/tickets";

const PERSON = {
  grado: "Mayor",
  apellidos: "Gomez",
  nombres: "Juan",
  cip: "999",
  dni: "111",
};

beforeEach(async () => {
  await db.execute(sql`delete from ${lookupAttempt}`);
  await db.execute(sql`delete from ${ticket}`);
  await db.execute(sql`delete from ${personnel}`);
  await db.insert(personnel).values(PERSON);
});

describe("lookupTicketByCredentials", () => {
  it("returns the ticket id for a cip+dni that matches an issued ticket", async () => {
    const [person] = await db.select().from(personnel);
    const created = await createOrGetTicket(person.id);

    const result = await lookupTicketByCredentials(PERSON.cip, PERSON.dni);

    expect(result).toEqual({ ok: true, data: { ticketId: created.id } });
  });

  it("rejects the 6th failed attempt within an hour with RATE_LIMITED, even with correct credentials", async () => {
    const [person] = await db.select().from(personnel);
    await createOrGetTicket(person.id);

    for (let i = 0; i < 5; i++) {
      await lookupTicketByCredentials(PERSON.cip, "wrong-dni");
    }

    const sixth = await lookupTicketByCredentials(PERSON.cip, PERSON.dni);

    expect(sixth).toEqual({
      ok: false,
      error: { code: "RATE_LIMITED", message: expect.any(String) },
    });
  });

  it("does not count a failed attempt older than one hour toward the limit", async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    for (let i = 0; i < 5; i++) {
      await db
        .insert(lookupAttempt)
        .values({ cip: PERSON.cip, createdAt: twoHoursAgo });
    }

    const [person] = await db.select().from(personnel);
    const created = await createOrGetTicket(person.id);

    const result = await lookupTicketByCredentials(PERSON.cip, PERSON.dni);

    expect(result).toEqual({ ok: true, data: { ticketId: created.id } });
  });
});
