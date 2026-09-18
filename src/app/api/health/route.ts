import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DB_UNREACHABLE",
          message: "No se pudo conectar a la base de datos.",
        },
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, data: { db: "ok" } });
}
