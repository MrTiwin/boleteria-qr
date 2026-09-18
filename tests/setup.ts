import "dotenv/config";

// Loaded by vitest.config.ts's `setupFiles` before every test file. This is the standalone
// test runner's env-loading mechanism — see blueprint §19.6, "Every tool that reads env vars
// must be given a way to load them". Without it, any test importing src/db/client.ts throws
// "DATABASE_URL is not set" even though .env exists on disk, because vitest never sourced it.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Run `docker compose up -d test-db` and copy .env.example to .env.",
  );
}
