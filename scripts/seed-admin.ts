import "dotenv/config";
import { seedAdmin } from "../src/lib/admin-seed.ts";
import { env } from "../src/lib/env.ts";

// Standalone script, run once with `pnpm exec tsx scripts/seed-admin.ts`. Idempotent: running it
// twice with the same ADMIN_SEED_EMAIL/PASSWORD leaves exactly one matching admin user — see
// CLAUDE.md's Environment table for where the two env vars come from.
async function main() {
  const email = env.ADMIN_SEED_EMAIL;
  const password = env.ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD must both be set.",
    );
  }

  const result = await seedAdmin(email, password);
  console.log(
    result.created
      ? `Seeded admin user ${email}.`
      : `Admin user ${email} already exists — nothing to do.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
