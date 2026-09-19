import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db/client.ts";

// One-off data repair: DNIs exported from a spreadsheet as numbers lost their leading zero
// (08169957 -> 8169957). Left-pads every all-digit DNI shorter than 8 to 8 digits. Idempotent —
// a second run finds nothing to change. Aborts without writing if padding would collide with a
// DNI that already exists (personnel.dni is unique).
async function main() {
  await db.transaction(async (tx) => {
    const short = await tx.execute(
      sql`select id, dni from personnel where dni ~ '^[0-9]+$' and length(dni) < 8`,
    );
    console.log(`DNIs with fewer than 8 digits: ${short.rows.length}`);

    if (short.rows.length === 0) {
      return;
    }

    const collisions = await tx.execute(
      sql`select s.dni as short_dni, lpad(s.dni, 8, '0') as padded
          from personnel s
          join personnel o on o.dni = lpad(s.dni, 8, '0') and o.id <> s.id
          where s.dni ~ '^[0-9]+$' and length(s.dni) < 8`,
    );
    if (collisions.rows.length > 0) {
      console.error("Aborting — padding would duplicate an existing DNI:");
      console.error(collisions.rows);
      process.exit(1);
    }

    const updated = await tx.execute(
      sql`update personnel set dni = lpad(dni, 8, '0')
          where dni ~ '^[0-9]+$' and length(dni) < 8`,
    );
    console.log(`Updated ${updated.rowCount} DNI(s) to 8 digits.`);
  });

  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
