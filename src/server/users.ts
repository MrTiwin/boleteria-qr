import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { account, session, user as userTable } from "@/db/schema";
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

// Scoped to role='anfitrion' throughout, so this can never delete an admin account even if a
// caller passed the wrong id. Deletes `session` and `account` first — both reference user.id
// with no ON DELETE CASCADE (Better Auth's own schema), so deleting the user row first throws a
// foreign-key violation with an active session or the always-present credential account row.
export async function deleteHostUser(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [host] = await tx
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(eq(userTable.id, userId), eq(userTable.role, "anfitrion")));
    if (!host) return;

    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx.delete(userTable).where(eq(userTable.id, userId));
  });
}
