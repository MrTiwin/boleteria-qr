import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/admin/export/route";
import { db } from "@/db/client";
import { account, personnel, session, ticket, user } from "@/db/schema";
import { seedAdmin } from "@/lib/admin-seed";
import { auth } from "@/lib/auth";
import { createOrGetTicket } from "@/server/tickets";

const ADMIN_EMAIL = `admin-export-${Date.now()}@example.org`;
const ADMIN_PASSWORD = "correct-horse-battery-staple";

async function signInAndGetCookieHeader(): Promise<string> {
  const response = await auth.api.signInEmail({
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    asResponse: true,
  });
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("signInEmail did not set a cookie");
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

describe("GET /api/admin/export", () => {
  it("returns 401 for an unauthenticated request", async () => {
    const response = await GET(
      new Request("http://localhost/api/admin/export"),
    );
    expect(response.status).toBe(401);
  });

  it("returns a CSV with one row per personnel record, including grado, apellidos, nombres, cip, pagado, status, verified_at", async () => {
    const cookie = await signInAndGetCookieHeader();
    const [person] = await db
      .insert(personnel)
      .values({
        grado: "Mayor",
        apellidos: "Gomez",
        nombres: "Juan",
        cip: "1",
        dni: "2",
        pagado: true,
      })
      .returning();
    await createOrGetTicket(person.id);

    const response = await GET(
      new Request("http://localhost/api/admin/export", { headers: { cookie } }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");

    const csv = await response.text();
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "grado,apellidos,nombres,cip,pagado,status,verified_at",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Mayor,Gomez,Juan,1,SI,issued,");
  });
});
