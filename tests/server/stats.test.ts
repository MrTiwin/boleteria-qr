import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/admin/stats/route";
import { db } from "@/db/client";
import { account, personnel, session, ticket, user } from "@/db/schema";
import { seedAdmin } from "@/lib/admin-seed";
import { auth } from "@/lib/auth";
import { createStation } from "@/server/stations";
import { createOrGetTicket } from "@/server/tickets";
import { verifyTicket } from "@/server/verify";

const ADMIN_EMAIL = `admin-stats-${Date.now()}@example.org`;
const ADMIN_PASSWORD = "correct-horse-battery-staple";

async function signInAndGetCookieHeader(): Promise<string> {
  const response = await auth.api.signInEmail({
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    asResponse: true,
  });
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("signInEmail did not set a cookie");
  // A Set-Cookie header can carry multiple attributes after the first ";" — only the
  // name=value pair before it belongs in a request's Cookie header.
  return setCookie.split(";")[0];
}

beforeEach(async () => {
  await db.execute(sql`delete from ${ticket}`);
  await db.execute(sql`delete from ${personnel}`);
  await db.execute(sql`delete from ${session}`);
  await db.execute(sql`delete from ${account}`);
  await db.execute(sql`delete from ${user}`);
  await seedAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
});

describe("GET /api/admin/stats", () => {
  it("returns 401 and no counts for an unauthenticated request", async () => {
    const response = await GET(new Request("http://localhost/api/admin/stats"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it("returns real verified/total counts for an authenticated admin", async () => {
    const cookie = await signInAndGetCookieHeader();
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
    await createOrGetTicket(person.id);

    const response = await GET(
      new Request("http://localhost/api/admin/stats", { headers: { cookie } }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true, data: { verified: 0, total: 1 } });
  });

  it("reflects a ticket's status change to verified on the next call", async () => {
    const cookie = await signInAndGetCookieHeader();
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
    const { station } = await createStation("Puerta 1");

    const before = await (
      await GET(
        new Request("http://localhost/api/admin/stats", {
          headers: { cookie },
        }),
      )
    ).json();
    expect(before.data.verified).toBe(0);

    await verifyTicket(created.qrToken, station.id);

    const after = await (
      await GET(
        new Request("http://localhost/api/admin/stats", {
          headers: { cookie },
        }),
      )
    ).json();
    expect(after.data.verified).toBe(1);
  });
});
