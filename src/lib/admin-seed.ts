import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { account, user as userTable } from "@/db/schema";

// Public sign-up is disabled on the Better Auth instance (see src/lib/auth.ts,
// `disableSignUp: true`) — verified live: `auth.api.signUpEmail` throws
// EMAIL_PASSWORD_SIGN_UP_DISABLED even called from server code. This is the seed path instead: it
// writes the `user` and `account` rows directly, using Better Auth's own `hashPassword` so
// `auth.api.signInEmail` validates the result identically to a normal sign-up.
export async function seedAdmin(
  email: string,
  password: string,
): Promise<{ created: boolean }> {
  const existing = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email));
  if (existing.length > 0) {
    return { created: false };
  }

  const userId = randomUUID();
  const hashedPassword = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx
      .insert(userTable)
      .values({ id: userId, name: "Admin", email, emailVerified: true });
    await tx.insert(account).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
    });
  });

  return { created: true };
}
