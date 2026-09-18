import "server-only";
import { randomInt } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { verificationStation } from "@/db/schema";
import type { ActionResult } from "@/server/tickets";

// Excludes visually-ambiguous characters (0/O, 1/I) — these codes get read aloud and typed by
// hand at the door.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateStationCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

// Returns the plaintext code ONCE, to show the admin right after creating/rotating — it is never
// recoverable again, only code_hash is stored (better-auth/crypto's hashPassword, same primitive
// used for the admin's own password — see src/lib/admin-seed.ts).
export async function createStation(label: string) {
  const code = generateStationCode();
  const codeHash = await hashPassword(code);
  const [station] = await db
    .insert(verificationStation)
    .values({ label, codeHash, active: true })
    .returning();
  return { station, code };
}

export async function rotateStationCode(stationId: string) {
  const code = generateStationCode();
  const codeHash = await hashPassword(code);
  await db
    .update(verificationStation)
    .set({ codeHash })
    .where(eq(verificationStation.id, stationId));
  return { code };
}

export async function deactivateStation(stationId: string): Promise<void> {
  await db
    .update(verificationStation)
    .set({ active: false })
    .where(eq(verificationStation.id, stationId));
}

// Linear scan over active stations only — there are 6-8 of them, and codes are hashed, so there
// is no indexed lookup available. A deactivated station's code never matches here, even if it is
// otherwise correct, because the WHERE clause excludes it before any hash comparison runs.
export async function verifyStationCode(
  code: string,
): Promise<ActionResult<{ stationId: string; label: string }>> {
  const activeStations = await db
    .select()
    .from(verificationStation)
    .where(eq(verificationStation.active, true));

  for (const station of activeStations) {
    if (await verifyPassword({ hash: station.codeHash, password: code })) {
      return {
        ok: true,
        data: { stationId: station.id, label: station.label },
      };
    }
  }

  return {
    ok: false,
    error: {
      code: "INVALID_CODE",
      message: "Código de estación inválido o inactivo.",
    },
  };
}
