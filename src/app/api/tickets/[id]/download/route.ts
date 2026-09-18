import { type NextRequest, NextResponse } from "next/server";
import { recordTicketDownload } from "@/server/ticket-downloads";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const result = await recordTicketDownload(id, ip);

  if (!result.ok) {
    const status = result.error.code === "RATE_LIMITED" ? 429 : 404;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
