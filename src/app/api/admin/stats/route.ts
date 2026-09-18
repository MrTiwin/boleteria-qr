import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminStats } from "@/server/stats";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Sesión de admin no válida.",
        },
      },
      { status: 401 },
    );
  }

  const stats = await getAdminStats();
  return NextResponse.json({ ok: true, data: stats });
}
