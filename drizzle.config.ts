import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Standalone CLI — drizzle-kit does not run inside the Next.js framework, so it never gets
// .env loaded for free. `import "dotenv/config"` above is the explicit loader (see blueprint
// §19.6 — "Every tool that reads env vars must be given a way to load them").
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set — copy .env.example to .env and fill it in.",
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
