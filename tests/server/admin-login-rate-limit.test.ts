import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { adminLoginAttempt } from "@/db/schema";
import {
  isAdminLoginRateLimited,
  recordFailedAdminLogin,
} from "@/server/admin-login-rate-limit";

describe("admin login rate limit (touches TEST_DATABASE_URL)", () => {
  beforeEach(async () => {
    await db.execute(sql`delete from ${adminLoginAttempt}`);
  });

  it("is not rate-limited with no prior failed attempts", async () => {
    expect(await isAdminLoginRateLimited("admin@example.org")).toBe(false);
  });

  it("rate-limits after 5 failed attempts for the same email within the window", async () => {
    const email = "admin@example.org";
    for (let i = 0; i < 5; i++) {
      await recordFailedAdminLogin(email);
    }
    expect(await isAdminLoginRateLimited(email)).toBe(true);
  });

  it("does not count failed attempts for a different email", async () => {
    for (let i = 0; i < 5; i++) {
      await recordFailedAdminLogin("someone-else@example.org");
    }
    expect(await isAdminLoginRateLimited("admin@example.org")).toBe(false);
  });
});
