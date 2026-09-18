import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { personnel, ticket, ticketDownloadLog } from "@/db/schema";
import { recordTicketDownload } from "@/server/ticket-downloads";
import { createOrGetTicket } from "@/server/tickets";

let personnelId: string;

beforeEach(async () => {
  await db.execute(sql`delete from ${ticketDownloadLog}`);
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
  personnelId = person.id;
});

describe("recordTicketDownload", () => {
  it("increments download_count by 1 and inserts one log row with the caller's IP, for an existing ticket", async () => {
    const created = await createOrGetTicket(personnelId);

    const result = await recordTicketDownload(created.id, "203.0.113.7");

    expect(result).toEqual({ ok: true, data: { downloadCount: 1 } });
    const [row] = await db
      .select()
      .from(ticket)
      .where(eq(ticket.id, created.id));
    expect(row.downloadCount).toBe(1);
    const logs = await db
      .select()
      .from(ticketDownloadLog)
      .where(eq(ticketDownloadLog.ticketId, created.id));
    expect(logs).toHaveLength(1);
    expect(logs[0].ip).toBe("203.0.113.7");
  });

  it("called 3 times leaves download_count at 3 and 3 log rows", async () => {
    const created = await createOrGetTicket(personnelId);

    await recordTicketDownload(created.id, "203.0.113.7");
    await recordTicketDownload(created.id, "203.0.113.8");
    await recordTicketDownload(created.id, "203.0.113.9");

    const [row] = await db
      .select()
      .from(ticket)
      .where(eq(ticket.id, created.id));
    expect(row.downloadCount).toBe(3);
    const logs = await db
      .select()
      .from(ticketDownloadLog)
      .where(eq(ticketDownloadLog.ticketId, created.id));
    expect(logs).toHaveLength(3);
  });

  it("rate-limits after 10 downloads of the same ticket within the window", async () => {
    const created = await createOrGetTicket(personnelId);

    for (let i = 0; i < 10; i++) {
      await recordTicketDownload(created.id, "203.0.113.7");
    }

    const result = await recordTicketDownload(created.id, "203.0.113.7");

    expect(result).toEqual({
      ok: false,
      error: { code: "RATE_LIMITED", message: expect.any(String) },
    });
    const [row] = await db
      .select()
      .from(ticket)
      .where(eq(ticket.id, created.id));
    expect(row.downloadCount).toBe(10);
  });

  it("returns NOT_FOUND and writes no row for a nonexistent ticket id", async () => {
    const result = await recordTicketDownload(
      "00000000-0000-0000-0000-000000000000",
      "203.0.113.7",
    );

    expect(result).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: expect.any(String) },
    });
    const logs = await db.select().from(ticketDownloadLog);
    expect(logs).toHaveLength(0);
  });
});
