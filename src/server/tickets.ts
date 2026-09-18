import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { personnel, ticket } from "@/db/schema";
import { signQrToken } from "@/lib/qr-token";
import { isRateLimited, recordFailedAttempt } from "@/server/rate-limit";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// The ONLY writer of the `ticket` table — see CLAUDE.md and .claude/rules/verification.md.
// Returns the existing ticket for this person if one already exists (idempotent), otherwise
// creates one. The id is generated here, in JS, rather than left to the database default,
// because signQrToken needs it before the row exists.
export async function createOrGetTicket(personnelId: string) {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(ticket)
      .where(eq(ticket.personnelId, personnelId));
    if (existing.length > 0) {
      return existing[0];
    }

    const id = randomUUID();
    const [created] = await tx
      .insert(ticket)
      .values({ id, personnelId, qrToken: signQrToken(id) })
      .returning();

    return created;
  });
}

// Deletes the person's ticket outright, rather than resetting its status back to "issued" —
// their old QR image (already downloaded, possibly already shown at the door) signs the OLD
// ticket id, so re-activating that same row would let a stale screenshot verify again. Deleting
// it forces createOrGetTicket to mint a brand-new id (and signature) the next time they register.
export async function resetTicket(personnelId: string): Promise<void> {
  await db.delete(ticket).where(eq(ticket.personnelId, personnelId));
}

export async function registerByCredentials(input: {
  cip: string;
  dni: string;
  consent: boolean;
}): Promise<ActionResult<{ ticketId: string }>> {
  if (!input.consent) {
    return {
      ok: false,
      error: {
        code: "CONSENT_REQUIRED",
        message: "You must accept the personal-and-non-transferable notice.",
      },
    };
  }

  // Same budget as "buscar mi ticket" (src/server/rate-limit.ts) — this check actually creates
  // a ticket and exposes the matched person's name, so it must never be less protected than the
  // read-only lookup that shares its credential shape.
  if (await isRateLimited(input.cip)) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Demasiados intentos. Intenta de nuevo más tarde.",
      },
    };
  }

  const matches = await db
    .select()
    .from(personnel)
    .where(eq(personnel.cip, input.cip));
  const person = matches[0];

  if (!person || person.dni !== input.dni) {
    await recordFailedAttempt(input.cip);
    return {
      ok: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "CIP and DNI do not match a registered person.",
      },
    };
  }

  // Gate on pagado — deliberate product decision (overrides the older "informational only"
  // rule that used to live in CLAUDE.md's Non-negotiable section; see that file for the
  // corrected wording). Only blocks NEW ticket creation, never verification at the door: someone
  // who already has a ticket keeps scanning fine even if marked unpaid later.
  if (!person.pagado) {
    return {
      ok: false,
      error: {
        code: "PAYMENT_REQUIRED",
        message:
          "Aún no figuras como pagado. Comunícate con el Crl. John Sánchez Blas (cel. 944986558) para regularizar tu pago antes de generar tu ticket.",
      },
    };
  }

  const row = await createOrGetTicket(person.id);
  return { ok: true, data: { ticketId: row.id } };
}
