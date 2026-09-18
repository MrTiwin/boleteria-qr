import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { personnel, ticket, verificationStation } from "@/db/schema";
import { createStation } from "@/server/stations";
import { createOrGetTicket } from "@/server/tickets";
import { verifyTicket } from "@/server/verify";

let personnelId: string;
let stationId: string;

beforeEach(async () => {
  await db.execute(sql`delete from ${ticket}`);
  await db.execute(sql`delete from ${personnel}`);
  await db.execute(sql`delete from ${verificationStation}`);

  const [person] = await db
    .insert(personnel)
    .values({
      grado: "Mayor",
      apellidos: "Gomez",
      nombres: "Juan",
      cip: "1",
      dni: "2",
    })
    .returning();
  personnelId = person.id;

  const { station } = await createStation("Puerta 1");
  stationId = station.id;
});

describe("verifyTicket", () => {
  it("marks an unverified ticket as verified, recording verified_at and verified_by_station", async () => {
    const created = await createOrGetTicket(personnelId);

    const result = await verifyTicket(created.qrToken, stationId);

    expect(result).toEqual({ ok: true, data: { alreadyVerified: false } });
    const [row] = await db
      .select()
      .from(ticket)
      .where(eq(ticket.id, created.id));
    expect(row.status).toBe("verified");
    expect(row.verifiedAt).not.toBeNull();
    expect(row.verifiedByStation).toBe(stationId);
  });

  it("returns alreadyVerified:true on a second submission and does not change verified_at", async () => {
    const created = await createOrGetTicket(personnelId);

    await verifyTicket(created.qrToken, stationId);
    const [afterFirst] = await db
      .select()
      .from(ticket)
      .where(eq(ticket.id, created.id));

    const second = await verifyTicket(created.qrToken, stationId);
    const [afterSecond] = await db
      .select()
      .from(ticket)
      .where(eq(ticket.id, created.id));

    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.data).toMatchObject({
        alreadyVerified: true,
        stationLabel: "Puerta 1",
      });
    }
    expect(afterSecond.verifiedAt?.getTime()).toBe(
      afterFirst.verifiedAt?.getTime(),
    );
  });

  it("rejects a token with an invalid signature before any database write", async () => {
    const created = await createOrGetTicket(personnelId);
    const tampered = `${created.qrToken.slice(0, -1)}${created.qrToken.at(-1) === "a" ? "b" : "a"}`;

    const result = await verifyTicket(tampered, stationId);

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_SIGNATURE", message: expect.any(String) },
    });
    const [row] = await db
      .select()
      .from(ticket)
      .where(eq(ticket.id, created.id));
    expect(row.status).toBe("issued");
  });

  it("marks exactly one of 10 concurrent requests for the same ticket as the winner", async () => {
    const created = await createOrGetTicket(personnelId);

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        verifyTicket(created.qrToken, stationId),
      ),
    );

    const winners = results.filter((r) => r.ok && !r.data.alreadyVerified);
    const alreadyVerified = results.filter(
      (r) => r.ok && r.data.alreadyVerified,
    );

    expect(winners).toHaveLength(1);
    expect(alreadyVerified).toHaveLength(9);
  });
});
