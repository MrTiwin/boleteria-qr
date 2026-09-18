"use server";

import { redirect } from "next/navigation";
import {
  activateStation,
  createStation,
  deactivateStation,
  rotateStationCode,
} from "@/server/stations";

export async function createStationAction(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    redirect("/admin/estaciones");
  }

  const { code } = await createStation(label);
  redirect(
    `/admin/estaciones?newCode=${encodeURIComponent(code)}&label=${encodeURIComponent(label)}`,
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
