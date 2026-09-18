import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// The only file that touches QR_HMAC_SECRET — see CLAUDE.md, "Where things live". Token shape is
// `<ticketId>.<hmac-sha256-hex-of-ticketId>`; verification recomputes the HMAC and compares in
// constant time so a tampered token never leaks timing information about how close it was.
function sign(ticketId: string): string {
  if (!env.QR_HMAC_SECRET) {
    throw new Error("QR_HMAC_SECRET is not set.");
  }
  return createHmac("sha256", env.QR_HMAC_SECRET)
    .update(ticketId)
    .digest("hex");
}

export function signQrToken(ticketId: string): string {
  return `${ticketId}.${sign(ticketId)}`;
}

export type VerifyQrTokenResult =
  | { valid: false }
  | { valid: true; ticketId: string };

export function verifyQrToken(token: string): VerifyQrTokenResult {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) {
    return { valid: false };
  }

  const ticketId = token.slice(0, lastDot);
  const providedSignature = token.slice(lastDot + 1);
  const expectedSignature = sign(ticketId);

  const providedBuffer = Buffer.from(providedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { valid: false };
  }

  return { valid: true, ticketId };
}
