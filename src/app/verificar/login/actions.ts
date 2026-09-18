"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { stationLoginSchema } from "@/lib/schemas";
import { setStationSessionCookie } from "@/lib/station-session";
import { verifyStationCode } from "@/server/stations";

export type StationLoginActionState = {
  error: { code: string; message: string } | null;
};

export async function stationLoginAction(
  _prevState: StationLoginActionState,
  formData: FormData,
): Promise<StationLoginActionState> {
  const parsed = stationLoginSchema.safeParse({ code: formData.get("code") });

  if (!parsed.success) {
    return {
      error: {
        code: "INVALID_INPUT",
        message: parsed.error.issues[0]?.message ?? "Código inválido.",
      },
    };
  }

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const result = await verifyStationCode(parsed.data.code, ip);

  if (!result.ok) {
    return { error: result.error };
  }

  await setStationSessionCookie(result.data.stationId);
  redirect("/verificar");
}
