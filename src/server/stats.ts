import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { personnel, ticket } from "@/db/schema";
import { compareByGrado } from "@/lib/grados";

export type AdminStats = { verified: number; total: number };

export async function getAdminStats(): Promise<AdminStats> {
  const [totalRow] = await db.select({ value: count() }).from(personnel);
  const [verifiedRow] = await db
    .select({ value: count() })
    .from(ticket)
    .where(eq(ticket.status, "verified"));

  return {
    verified: verifiedRow?.value ?? 0,
    total: totalRow?.value ?? 0,
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
