import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { personnel, ticket } from "@/db/schema";
import { signQrToken, verifyQrToken } from "@/lib/qr-token";
import { createOrGetTicket } from "@/server/tickets";

describe("signQrToken / verifyQrToken (no DB)", () => {
  it("verifyQrToken returns valid:true with the matching ticketId for the exact stored token", () => {
    const token = signQrToken("11111111-1111-1111-1111-111111111111");
    const result = verifyQrToken(token);
    expect(result).toEqual({
      valid: true,
      ticketId: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("verifyQrToken returns valid:false for a token with one tampered character", () => {
    const token = signQrToken("11111111-1111-1111-1111-111111111111");
    const lastChar = token.at(-1);
    const tamperedChar = lastChar === "a" ? "b" : "a";
    const tampered = `${token.slice(0, -1)}${tamperedChar}`;

    expect(verifyQrToken(tampered)).toEqual({ valid: false });
  });

  it("verifyQrToken returns valid:false for a token with no signature at all", () => {
    expect(verifyQrToken("not-a-real-token")).toEqual({ valid: false });
  });
});

describe("createOrGetTicket stores a real signed token (touches TEST_DATABASE_URL)", () => {
  it("stores a qr_token whose signature verifies against its own ticket id", async () => {
    await db.execute(sql`delete from ${ticket}`);
    await db.execute(sql`delete from ${personnel}`);
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

    const created = await createOrGetTicket(person.id);
    const result = verifyQrToken(created.qrToken);

    expect(result).toEqual({ valid: true, ticketId: created.id });
  });
});
