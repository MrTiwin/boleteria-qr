import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { adminLoginAttempt } from "@/db/schema";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

// Keyed by the attempted email, not IP — mirrors src/server/rate-limit.ts's CIP-keyed lookup
// budget. See src/db/schema.ts's admin_login_attempt for why this exists at all: Better Auth's
// own rate limiter never sees this form's direct auth.api.signInEmail(...) calls.
export async function isAdminLoginRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [recent] = await db
    .select({ value: count() })
    .from(adminLoginAttempt)
    .where(
      and(
        eq(adminLoginAttempt.email, email),
        gt(adminLoginAttempt.createdAt, since),
      ),
    );

  return (recent?.value ?? 0) >= MAX_ATTEMPTS_PER_WINDOW;
}

export async function recordFailedAdminLogin(email: string): Promise<void> {
  await db.insert(adminLoginAttempt).values({ email });
}
