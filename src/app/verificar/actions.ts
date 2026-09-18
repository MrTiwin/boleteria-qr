"use server";

import { redirect } from "next/navigation";
import { clearStationSessionCookie } from "@/lib/station-session";

export async function stationLogoutAction() {
  await clearStationSessionCookie();
  redirect("/verificar/login");
}
