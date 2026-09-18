import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { stationLoginAttempt, verificationStation } from "@/db/schema";
import {
  createStationSessionToken,
  verifyStationSessionToken,
} from "@/lib/station-session";
import {
  createStation,
  deactivateStation,
  rotateStationCode,
  verifyStationCode,
} from "@/server/stations";

describe("station session token (no DB)", () => {
  it("round-trips: verifyStationSessionToken recovers the stationId from a token created by createStationSessionToken", () => {
    const token = createStationSessionToken("station-123");
    expect(verifyStationSessionToken(token)).toEqual({
      valid: true,
      stationId: "station-123",
    });
  });

  it("rejects a tampered token", () => {
    const token = createStationSessionToken("station-123");
    const tampered = `${token.slice(0, -1)}${token.at(-1) === "a" ? "b" : "a"}`;
    expect(verifyStationSessionToken(tampered)).toEqual({ valid: false });
  });
});

describe("stations (touches TEST_DATABASE_URL)", () => {
  beforeEach(async () => {
    await db.execute(sql`delete from ${verificationStation}`);
    await db.execute(sql`delete from ${stationLoginAttempt}`);
  });

  it("stores only a hash of the code when a station is created, never the plaintext", async () => {
    const { station, code } = await createStation("Puerta 1");
    expect(station.codeHash).not.toBe(code);
    expect(station.codeHash.length).toBeGreaterThan(code.length);
  });

  it("verifies a freshly created station's code", async () => {
    const { code } = await createStation("Puerta 1");
    const result = await verifyStationCode(code, "203.0.113.1");
    expect(result.ok).toBe(true);
  });

  it("rejects the old code after rotation, and accepts the new one", async () => {
    const { station, code: oldCode } = await createStation("Puerta 1");
    const { code: newCode } = await rotateStationCode(station.id);

    expect(await verifyStationCode(oldCode, "203.0.113.2")).toEqual({
      ok: false,
      error: { code: "INVALID_CODE", message: expect.any(String) },
    });
    expect((await verifyStationCode(newCode, "203.0.113.2")).ok).toBe(true);
  });

  it("rejects a deactivated station's code even though it is otherwise correct", async () => {
    const { station, code } = await createStation("Puerta 1");
    await deactivateStation(station.id);

    expect(await verifyStationCode(code, "203.0.113.3")).toEqual({
      ok: false,
      error: { code: "INVALID_CODE", message: expect.any(String) },
    });
  });

  it("rate-limits repeated failed attempts from the same IP", async () => {
    await createStation("Puerta 1");
    const ip = "203.0.113.4";

    for (let i = 0; i < 10; i++) {
      await verifyStationCode("WRONGCODE", ip);
    }

    expect(await verifyStationCode("WRONGCODE", ip)).toEqual({
      ok: false,
      error: { code: "RATE_LIMITED", message: expect.any(String) },
    });
  });
});
