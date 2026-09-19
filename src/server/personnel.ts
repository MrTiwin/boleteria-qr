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

// Re-checks cip/dni uniqueness by hand because these are single-row writes, not the bulk
// import's all-or-nothing INSERT (src/lib/import-personnel.ts) — the database's own unique
// constraints are the actual guarantee, this just turns that into a friendly error instead of a
// 500. `excludeId` skips the row being edited so a person doesn't conflict with themselves.
async function findIdentityConflict(
  input: Pick<EditPersonnelInput, "cip" | "dni">,
  excludeId?: string,
): Promise<{ code: string; message: string } | null> {
  const sameIdentity = or(
    eq(personnel.cip, input.cip),
    eq(personnel.dni, input.dni),
  );
  const conflicts = await db
    .select({ cip: personnel.cip, dni: personnel.dni })
    .from(personnel)
    .where(
      excludeId ? and(ne(personnel.id, excludeId), sameIdentity) : sameIdentity,
    );

  if (conflicts.some((row) => row.cip === input.cip)) {
    return {
      code: "CIP_TAKEN",
      message: "Ese CIP ya pertenece a otra persona.",
    };
  }
  if (conflicts.some((row) => row.dni === input.dni)) {
    return {
      code: "DNI_TAKEN",
      message: "Ese DNI ya pertenece a otra persona.",
    };
  }
  return null;
}

export async function updatePersonnel(
  id: string,
  input: EditPersonnelInput,
): Promise<ActionResult<{ id: string }>> {
  const conflict = await findIdentityConflict(input, id);
  if (conflict) {
    return { ok: false, error: conflict };
  }

  await db.update(personnel).set(input).where(eq(personnel.id, id));
  return { ok: true, data: { id } };
}

export async function createPersonnel(
  input: EditPersonnelInput,
): Promise<ActionResult<{ id: string }>> {
  const conflict = await findIdentityConflict(input);
  if (conflict) {
    return { ok: false, error: conflict };
  }

  const [created] = await db
    .insert(personnel)
    .values(input)
    .returning({ id: personnel.id });
  return { ok: true, data: { id: created.id } };
}
