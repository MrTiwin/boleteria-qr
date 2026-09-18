"use server";

import { revalidatePath } from "next/cache";
import { resetTicket } from "@/server/tickets";

// Same effect as resetTicketAction in admin/personal/[id]/actions.ts (delete the ticket so the
// person goes back to "sin-registrar"), but revalidates the dashboard in place instead of
// redirecting into the edit page — this is the quick "reset for testing" action attached
// directly to each row of the attendance table.
export async function resetTicketFromDashboardAction(formData: FormData) {
  const personnelId = String(formData.get("personnelId") ?? "");
  await resetTicket(personnelId);
  revalidatePath("/admin");
}
