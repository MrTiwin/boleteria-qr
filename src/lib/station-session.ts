import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// A signed cookie, deliberately separate from Better Auth's admin session (see CLAUDE.md — one
// station code, shared by the door staff, is not an individual account). Reuses
// BETTER_AUTH_SECRET to sign it rather than adding a third secret to .env for the same class of
// problem qr-token.ts already solves — same HMAC pattern, different purpose.
const COOKIE_NAME = "station_session";

function sign(stationId: string): string {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is not set.");
  }
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(stationId)
    .digest("hex");
}

export function createStationSessionToken(stationId: string): string {
  return `${stationId}.${sign(stationId)}`;
}

export type VerifyStationSessionResult =
  | { valid: false }
  | { valid: true; stationId: string };

export function verifyStationSessionToken(
  token: string,
): VerifyStationSessionResult {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) {
    return { valid: false };
  }

  const stationId = token.slice(0, lastDot);
  const providedSignature = token.slice(lastDot + 1);
  const expectedSignature = sign(stationId);

  const providedBuffer = Buffer.from(providedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { valid: false };
  }

  return { valid: true, stationId };
}

export async function setStationSessionCookie(
  stationId: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createStationSessionToken(stationId), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function getStationSession(): Promise<{
  stationId: string;
} | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const result = verifyStationSessionToken(token);
  return result.valid ? { stationId: result.stationId } : null;
}
