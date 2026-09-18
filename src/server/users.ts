import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { account, user as userTable } from "@/db/schema";
import type { ActionResult } from "@/server/tickets";

// Same alphabet as station codes (src/server/stations.ts) — no visually-ambiguous characters,
// since this gets read aloud and typed by hand once, right after creation.
const PASSWORD_ALPHABET =
  "ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";

function generateTempPassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  }
  return password;
}

export async function listHostUsers() {
  return db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(eq(userTable.role, "anfitrion"))
    .orderBy(desc(userTable.createdAt));
}

// Returns the plaintext temp password ONCE, same pattern as createStation in
// src/server/stations.ts — it is never recoverable again after this call returns.
export async function createHostUser(
  name: string,
  email: string,
): Promise<ActionResult<{ password: string }>> {
  const existing = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email));
  if (existing.length > 0) {
    return {
      ok: false,
      error: { code: "EMAIL_TAKEN", message: "Ese correo ya está en uso." },
    };
  }

  const password = generateTempPassword();
  const userId = randomUUID();
  const hashedPassword = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx.insert(userTable).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "anfitrion",
    });
    await tx.insert(account).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
    });
  });

  return { ok: true, data: { password } };
}

// Scoped to role='anfitrion' in the WHERE clause itself, so this can never delete an admin
// account even if a caller passed the wrong id.
export async function deleteHostUser(userId: string): Promise<void> {
  await db
    .delete(userTable)
    .where(and(eq(userTable.id, userId), eq(userTable.role, "anfitrion")));
}
