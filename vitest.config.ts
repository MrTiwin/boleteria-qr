import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Excludes the bundle's own path (blueprint §19.6 — "the bundle sits inside the project") and
    // Playwright's e2e specs, which vitest must never try to collect.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "blueprints/**",
      "tests/e2e/**",
    ],
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    // Every DB-touching test file shares one real Postgres database (TEST_DATABASE_URL) and
    // cleans its own tables in beforeEach with a plain DELETE — there is no per-test transaction
    // or namespacing. Running test FILES in parallel (vitest's default) lets one file's cleanup
    // race another file's still-in-flight test against the same tables, surfacing as spurious
    // foreign-key violations that have nothing to do with the code under test. Serialize files;
    // tests within a file still share this database sequentially by default.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      // Mirrors tsconfig.json's "@/*" path alias — the framework's bundler resolves it from
      // tsconfig automatically, vitest does not, so it is restated here (resolution convention
      // matrix, blueprint §19.6).
      "@": path.resolve(__dirname, "./src"),
      // Next.js's "server-only" import guard throws when loaded outside the Next.js bundler.
      // Every module under src/server/ imports it, so every test that transitively imports a
      // server module needs it stubbed — see blueprint §19.6, "An emitted config must be
      // complete for the stack this blueprint chose".
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
    },
  },
});
