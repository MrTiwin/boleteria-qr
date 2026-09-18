import "server-only";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ticket, ticketDownloadLog } from "@/db/schema";
import type { ActionResult } from "@/server/tickets";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_DOWNLOADS_PER_WINDOW = 10;

// Logs a re-download/re-display of an already-generated ticket — part of the audit trail for the
// CIP+DNI weak-credential risk (see .claude/rules/database.md, ticket_download_log). This route
// has no session of its own (any visitor with the ticket link can hit it), so the per-ticket
// hourly cap below is the only thing standing between it and being spammed to bloat the audit
// log — 10/hour is generous for a person re-downloading their own QR a few times.
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

    const since = new Date(Date.now() - WINDOW_MS);
    const [recent] = await tx
      .select({ value: count() })
      .from(ticketDownloadLog)
      .where(
        and(
          eq(ticketDownloadLog.ticketId, ticketId),
          gt(ticketDownloadLog.createdAt, since),
        ),
      );
    if ((recent?.value ?? 0) >= MAX_DOWNLOADS_PER_WINDOW) {
      return {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Demasiadas descargas de este ticket. Intenta más tarde.",
        },
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
