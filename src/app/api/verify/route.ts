import { NextResponse } from "next/server";
import { getStationSession } from "@/lib/station-session";
import { verifyTicket } from "@/server/verify";

export async function POST(request: Request) {
  const session = await getStationSession();
  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Sesión de estación no válida.",
        },
      },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_INPUT", message: "Falta el token del QR." },
      },
      { status: 400 },
    );
  }

  const result = await verifyTicket(token, session.stationId);

  if (!result.ok) {
    const status =
      result.error.code === "NOT_FOUND"
        ? 404
        : result.error.code === "INVALID_SIGNATURE"
          ? 400
          : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
