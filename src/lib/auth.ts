import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import { account, session, user, verificationToken } from "@/db/schema";
import { env } from "@/lib/env";

// The one Better Auth server instance — every route reads the current actor through
// `auth.api.getSession(...)`, never through raw cookies. See CLAUDE.md, "Where things live".
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification: verificationToken },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // No public signup route exists — accounts are created only by scripts/seed-admin.ts. See
    // knowledge/shapes/internal-tool.md: "invite-only, no public signup route exists".
    disableSignUp: true,
  },
  // Must be last in the plugins array (Better Auth's own requirement). Without it, calling
  // auth.api.signInEmail from a server action returns a session but never sets the browser's
  // cookie — this hooks the API so a server action's response cookies are applied via
  // next/headers automatically.
  plugins: [nextCookies()],
});
