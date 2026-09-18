import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildAttendanceCsv } from "@/server/export";

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

  const csv = await buildAttendanceCsv();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=asistencia.csv",
    },
  });
}
