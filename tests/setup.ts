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

// src/lib/env.ts and src/db/client.ts read DATABASE_URL, never TEST_DATABASE_URL directly — this
// is the one place that substitutes the test database for it, so every test exercises the exact
// same client code path production uses.
//
// Always overrides, never just falls back when unset — a deployed environment (like the VPS
// container this app runs in) has its own real DATABASE_URL set for the running app, and if the
// test suite honored that value it would run every `delete from` in this suite against
// production data. Tests must never be able to reach the real database, full stop.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
