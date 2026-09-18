"use server";

import { redirect } from "next/navigation";
import { createStationSchema } from "@/lib/schemas";
import {
  activateStation,
  createStation,
  deactivateStation,
  rotateStationCode,
} from "@/server/stations";

export async function createStationAction(formData: FormData) {
  const parsed = createStationSchema.safeParse({
    label: formData.get("label"),
  });
  if (!parsed.success) {
    redirect(
      `/admin/estaciones?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Nombre inválido.")}`,
    );
  }

  const { code } = await createStation(parsed.data.label);
  redirect(
    `/admin/estaciones?newCode=${encodeURIComponent(code)}&label=${encodeURIComponent(parsed.data.label)}`,
  );
}

export async function rotateStationCodeAction(formData: FormData) {
  const stationId = String(formData.get("stationId") ?? "");
  const label = String(formData.get("label") ?? "");
  const { code } = await rotateStationCode(stationId);
  redirect(
    `/admin/estaciones?newCode=${encodeURIComponent(code)}&label=${encodeURIComponent(label)}`,
  );
}

export async function deactivateStationAction(formData: FormData) {
  const stationId = String(formData.get("stationId") ?? "");
  await deactivateStation(stationId);
  redirect("/admin/estaciones");
}

export async function activateStationAction(formData: FormData) {
  const stationId = String(formData.get("stationId") ?? "");
  await activateStation(stationId);
  redirect("/admin/estaciones");
}
