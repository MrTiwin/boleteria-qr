import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { lookupAttempt, personnel, ticket } from "@/db/schema";
import type { ActionResult } from "@/server/tickets";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

// Shared by both CIP+DNI credential checks in the app — "buscar mi ticket" below, and
// registration (src/server/tickets.ts). The two write to and read from the same lookup_attempt
// table/window: a failed attempt on either path counts against the same CIP's budget, since both
// are the same underlying "guess this person's DNI" attack.
export async function isRateLimited(cip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recentAttempts = await db
    .select()
    .from(lookupAttempt)
    .where(and(eq(lookupAttempt.cip, cip), gt(lookupAttempt.createdAt, since)));

  return recentAttempts.length >= MAX_ATTEMPTS_PER_WINDOW;
}

export async function recordFailedAttempt(cip: string): Promise<void> {
  await db.insert(lookupAttempt).values({ cip });
}

// "Buscar mi ticket" — reuses the same cip+dni identity check as registration, rate-limited by
// cip. The 6th failed attempt within an hour is rejected before the credentials are even checked,
// so a correct cip+dni submitted as the 6th attempt is still rejected — see E1-T7's acceptance.
export async function lookupTicketByCredentials(
  cip: string,
  dni: string,
): Promise<ActionResult<{ ticketId: string }>> {
  if (await isRateLimited(cip)) {
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
    .where(eq(personnel.cip, cip));
  const person = matches[0];

  if (!person || person.dni !== dni) {
    await recordFailedAttempt(cip);
    return {
      ok: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "CIP y DNI no coinciden con ningún registro.",
      },
    };
  }

  const ticketRows = await db
    .select()
    .from(ticket)
    .where(eq(ticket.personnelId, person.id));
  const found = ticketRows[0];

  if (!found) {
    await recordFailedAttempt(cip);
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Aún no generas tu ticket." },
    };
  }

  return { ok: true, data: { ticketId: found.id } };
}
