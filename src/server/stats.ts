import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { personnel, ticket } from "@/db/schema";
import { compareByGrado } from "@/lib/grados";

export type AdminStats = {
  total: number;
  // Everyone holding a ticket, verified or not — "registrado" in the dashboard's vocabulary.
  registered: number;
  verified: number;
  unregistered: number;
  debtors: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const [totalRow] = await db.select({ value: count() }).from(personnel);
  const [registeredRow] = await db.select({ value: count() }).from(ticket);
  const [verifiedRow] = await db
    .select({ value: count() })
    .from(ticket)
    .where(eq(ticket.status, "verified"));
  const [debtorsRow] = await db
    .select({ value: count() })
    .from(personnel)
    .where(eq(personnel.pagado, false));

  const total = totalRow?.value ?? 0;
  const registered = registeredRow?.value ?? 0;

  return {
    total,
    registered,
    verified: verifiedRow?.value ?? 0,
    unregistered: total - registered,
    debtors: debtorsRow?.value ?? 0,
  };
}

export type AttendanceRow = {
  personnelId: string;
  grado: string;
  apellidos: string;
  nombres: string;
  cip: string;
  pagado: boolean;
  status: "sin-registrar" | "issued" | "verified";
  verifiedAt: Date | null;
};

// Left-joins personnel to ticket so a person who never registered still shows up as
// "sin-registrar" — the admin needs to see gaps, not just what already happened.
export async function getAttendanceRows(): Promise<AttendanceRow[]> {
  const rows = await db
    .select({
      personnelId: personnel.id,
      grado: personnel.grado,
      apellidos: personnel.apellidos,
      nombres: personnel.nombres,
      cip: personnel.cip,
      pagado: personnel.pagado,
      ticketStatus: ticket.status,
      verifiedAt: ticket.verifiedAt,
    })
    .from(personnel)
    .leftJoin(ticket, eq(ticket.personnelId, personnel.id));

  return rows
    .map(
      (row): AttendanceRow => ({
        personnelId: row.personnelId,
        grado: row.grado,
        apellidos: row.apellidos,
        nombres: row.nombres,
        cip: row.cip,
        pagado: row.pagado,
        status: row.ticketStatus ?? "sin-registrar",
        verifiedAt: row.verifiedAt,
      }),
    )
    .sort(
      (a, b) =>
        compareByGrado(a.grado, b.grado) ||
        a.apellidos.localeCompare(b.apellidos, "es"),
    );
}
