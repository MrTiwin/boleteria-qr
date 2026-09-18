import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

// The only place a Pool is created. `pg` over TCP works identically against Neon (which speaks
// plain Postgres wire protocol, not only HTTP) and against the local docker-compose test-db — see
// the Bootstrap decision log for why this replaced the originally-pinned edge-only
// `@neondatabase/serverless` driver.
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes("neon.tech")
    ? { rejectUnauthorized: true }
    : undefined,
});

export const db = drizzle(pool, { schema });
