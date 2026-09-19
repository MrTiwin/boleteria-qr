import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { personnel, ticket, verificationStation } from "@/db/schema";
import { verifyQrToken } from "@/lib/qr-token";
import type { ActionResult } from "@/server/tickets";

// The person this ticket belongs to — returned on every successful scan (first-time verify AND
// already-verified) so station staff can visually confirm identity against the QR holder, not
// just see a pass/fail badge.
export type VerifiedPerson = {
  grado: string;
  apellidos: string;
  nombres: string;
  cip: string;
  pagado: boolean;
};

export type VerifyTicketData =
  | { alreadyVerified: false; person: VerifiedPerson }
  | {
      alreadyVerified: true;
      verifiedAt: Date | null;
      stationLabel: string | null;
      person: VerifiedPerson;
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
        message: "Código QR no reconocido — no pertenece a este evento.",
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
      const person = await getVerifiedPerson(tx, updated[0].personnelId);
      if (!person) {
        return {
          ok: false,
          error: { code: "NOT_FOUND", message: "Persona no encontrada." },
        };
      }
      return { ok: true, data: { alreadyVerified: false, person } };
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

    const [stationRows, person] = await Promise.all([
      current.verifiedByStation
        ? tx
            .select()
            .from(verificationStation)
            .where(eq(verificationStation.id, current.verifiedByStation))
        : Promise.resolve([]),
      getVerifiedPerson(tx, current.personnelId),
    ]);

    if (!person) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Persona no encontrada." },
      };
    }

    return {
      ok: true,
      data: {
        alreadyVerified: true,
        verifiedAt: current.verifiedAt,
        stationLabel: stationRows[0]?.label ?? null,
        person,
      },
    };
  });
}

async function getVerifiedPerson(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  personnelId: string,
): Promise<VerifiedPerson | null> {
  const [row] = await tx
    .select({
      grado: personnel.grado,
      apellidos: personnel.apellidos,
      nombres: personnel.nombres,
      cip: personnel.cip,
      pagado: personnel.pagado,
    })
    .from(personnel)
    .where(eq(personnel.id, personnelId));
  return row ?? null;
}
