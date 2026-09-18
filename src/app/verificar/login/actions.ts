"use server";

import { redirect } from "next/navigation";
import { setStationSessionCookie } from "@/lib/station-session";
import { verifyStationCode } from "@/server/stations";

export type StationLoginActionState = {
  error: { code: string; message: string } | null;
};

export async function stationLoginAction(
  _prevState: StationLoginActionState,
  formData: FormData,
): Promise<StationLoginActionState> {
  const code = String(formData.get("code") ?? "").trim();

  if (!code) {
    return {
      error: {
        code: "INVALID_INPUT",
        message: "Ingresa el código de la estación.",
      },
    };
  }

  const result = await verifyStationCode(code);

  if (!result.ok) {
    return { error: result.error };
  }

  await setStationSessionCookie(result.data.stationId);
  redirect("/verificar");
}
