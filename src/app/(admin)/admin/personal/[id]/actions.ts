"use server";

import { redirect } from "next/navigation";
import { editPersonnelSchema } from "@/lib/schemas";
import { updatePersonnel } from "@/server/personnel";
import { resetTicket } from "@/server/tickets";

export async function updatePersonnelAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const parsed = editPersonnelSchema.safeParse({
    grado: formData.get("grado"),
    apellidos: formData.get("apellidos"),
    nombres: formData.get("nombres"),
    cip: formData.get("cip"),
    dni: formData.get("dni"),
    pagado: formData.get("pagado") === "on",
  });

  if (!parsed.success) {
    redirect(
      `/admin/personal/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Revisa los campos obligatorios.")}`,
    );
  }

  const result = await updatePersonnel(id, parsed.data);
  if (!result.ok) {
    redirect(
      `/admin/personal/${id}?error=${encodeURIComponent(result.error.message)}`,
    );
  }

  redirect(`/admin/personal/${id}?saved=1`);
}

export async function resetTicketAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await resetTicket(id);
  redirect(`/admin/personal/${id}?reset=1`);
}
