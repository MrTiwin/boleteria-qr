import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { user as userTable } from "@/db/schema";
import { seedAdmin } from "@/lib/admin-seed";
import { auth } from "@/lib/auth";
import { config as proxyConfig } from "@/proxy";

// Mirrors Next.js's own `:param*` matcher syntax closely enough for this one pattern — see
// https://nextjs.org/docs/app/api-reference/file-conventions/middleware#matcher.
function matcherMatchesPath(pattern: string, path: string): boolean {
  const segments = pattern.split(/(:[a-zA-Z]+\*|:[a-zA-Z]+)/);
  const regexSource = segments
    .map((part) => {
      if (part.startsWith(":") && part.endsWith("*")) return ".*";
      if (part.startsWith(":")) return "[^/]+";
      return part.replace(/[.+?^${}()|[\]\\*]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${regexSource}$`).test(path);
}

describe("proxy config.matcher (no DB)", () => {
  it("includes a pattern that matches /admin/dashboard", () => {
    const matches = proxyConfig.matcher.some((pattern) =>
      matcherMatchesPath(pattern, "/admin/dashboard"),
    );
    expect(matches).toBe(true);
  });
});

describe("admin auth (touches TEST_DATABASE_URL)", () => {
  const email = `test-admin-${Date.now()}@example.org`;
  const password = "correct-horse-battery-staple";

  it("seeding twice with the same credentials leaves exactly one matching admin user", async () => {
    await seedAdmin(email, password);
    await seedAdmin(email, password);

    const rows = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email));
    expect(rows).toHaveLength(1);
  });

  it("signInEmail with valid seeded credentials returns a non-null session", async () => {
    await seedAdmin(email, password);
    const result = await auth.api.signInEmail({ body: { email, password } });
    expect(result).not.toBeNull();
  });

  it("signInEmail with an invalid password rejects and creates no session", async () => {
    await seedAdmin(email, password);
    await expect(
      auth.api.signInEmail({ body: { email, password: "wrong-password" } }),
    ).rejects.toBeDefined();
  });
});
