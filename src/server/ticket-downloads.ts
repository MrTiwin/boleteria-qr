import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ticket, ticketDownloadLog } from "@/db/schema";
import type { ActionResult } from "@/server/tickets";

// Logs a re-download/re-display of an already-generated ticket — part of the audit trail for the
// CIP+DNI weak-credential risk (see .claude/rules/database.md, ticket_download_log). Never blocks
// the download on write failure logic beyond "the ticket must exist".
export async function recordTicketDownload(
  ticketId: string,
  ip: string,
): Promise<ActionResult<{ downloadCount: number }>> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(ticket)
      .where(eq(ticket.id, ticketId));
    if (existing.length === 0) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Ticket not found." },
      };
    }

    const [updated] = await tx
      .update(ticket)
      .set({ downloadCount: sql`${ticket.downloadCount} + 1` })
      .where(eq(ticket.id, ticketId))
      .returning();

    await tx.insert(ticketDownloadLog).values({ ticketId, ip });

    return { ok: true, data: { downloadCount: updated.downloadCount } };
  });
}
