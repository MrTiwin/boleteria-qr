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
