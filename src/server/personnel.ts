import "server-only";
import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { personnel } from "@/db/schema";
import type { EditPersonnelInput } from "@/lib/schemas";
import type { ActionResult } from "@/server/tickets";

export async function getPersonnelById(id: string) {
  const rows = await db.select().from(personnel).where(eq(personnel.id, id));
  return rows[0] ?? null;
}

// Re-checks cip/dni uniqueness by hand because this is an UPDATE, not the bulk import's
// all-or-nothing INSERT (src/lib/import-personnel.ts) — the database's own unique constraints
// are the actual guarantee, this just turns that into a friendly error instead of a 500.
export async function updatePersonnel(
  id: string,
  input: EditPersonnelInput,
): Promise<ActionResult<{ id: string }>> {
  const conflicts = await db
    .select({ id: personnel.id, cip: personnel.cip, dni: personnel.dni })
    .from(personnel)
    .where(
      and(
        ne(personnel.id, id),
        or(eq(personnel.cip, input.cip), eq(personnel.dni, input.dni)),
      ),
    );

  if (conflicts.some((row) => row.cip === input.cip)) {
    return {
      ok: false,
      error: {
        code: "CIP_TAKEN",
        message: "Ese CIP ya pertenece a otra persona.",
      },
    };
  }
  if (conflicts.some((row) => row.dni === input.dni)) {
    return {
      ok: false,
      error: {
        code: "DNI_TAKEN",
        message: "Ese DNI ya pertenece a otra persona.",
      },
    };
  }

  await db.update(personnel).set(input).where(eq(personnel.id, id));
  return { ok: true, data: { id } };
}
