import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ticket, verificationStation } from "@/db/schema";
import { verifyQrToken } from "@/lib/qr-token";
import type { ActionResult } from "@/server/tickets";

export type VerifyTicketData =
  | { alreadyVerified: false }
  | {
      alreadyVerified: true;
      verifiedAt: Date | null;
      stationLabel: string | null;
    };

// The whole anti-double-scan guarantee lives in the single conditional UPDATE below — see
// .claude/rules/verification.md. Never read-then-write here: two stations scanning the same QR
// within milliseconds both reach this function, but only one UPDATE can match
// `status = 'issued'`, because Postgres serializes concurrent UPDATEs on the same row. The loser
// re-reads the now-committed row instead of writing anything.
export async function verifyTicket(
  token: string,
  stationId: string,
): Promise<ActionResult<VerifyTicketData>> {
  const verification = verifyQrToken(token);
  if (!verification.valid) {
    return {
      ok: false,
      error: {
        code: "INVALID_SIGNATURE",
        message: "El código QR no es válido.",
      },
    };
  }

  const { ticketId } = verification;

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(ticket)
      .set({
        status: "verified",
        verifiedAt: sql`now()`,
        verifiedByStation: stationId,
      })
      .where(and(eq(ticket.id, ticketId), eq(ticket.status, "issued")))
      .returning();

    if (updated.length === 1) {
      return { ok: true, data: { alreadyVerified: false } };
    }

    const [current] = await tx
      .select()
      .from(ticket)
      .where(eq(ticket.id, ticketId));
    if (!current) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Ticket no encontrado." },
      };
    }

    const stationRows = current.verifiedByStation
      ? await tx
          .select()
          .from(verificationStation)
          .where(eq(verificationStation.id, current.verifiedByStation))
      : [];

    return {
      ok: true,
      data: {
        alreadyVerified: true,
        verifiedAt: current.verifiedAt,
        stationLabel: stationRows[0]?.label ?? null,
      },
    };
  });
}
