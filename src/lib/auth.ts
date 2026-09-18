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
    // No public signup route exists — accounts are created only by scripts/seed-admin.ts and,
    // for the read-only "anfitrion" role, by an admin from /admin/usuarios. See
    // knowledge/shapes/internal-tool.md: "invite-only, no public signup route exists".
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
        defaultValue: "admin",
      },
    },
  },
  // Explicit rather than relying on Better Auth's implicit `enabled: isProduction` default —
  // this makes the protection visible in this file instead of depending on how NODE_ENV happens
  // to be set on whatever host runs this. Once enabled, Better Auth's own built-in special rule
  // throttles every /sign-in* path to 3 requests per 10s regardless of the general window/max
  // below — that's the actual brute-force protection on the admin login form.
  rateLimit: {
    enabled: true,
  },
  // Must be last in the plugins array (Better Auth's own requirement). Without it, calling
  // auth.api.signInEmail from a server action returns a session but never sets the browser's
  // cookie — this hooks the API so a server action's response cookies are applied via
  // next/headers automatically.
  plugins: [nextCookies()],
});
