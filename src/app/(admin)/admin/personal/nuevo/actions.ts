"use server";

import { redirect } from "next/navigation";
import { editPersonnelSchema } from "@/lib/schemas";
import { createPersonnel } from "@/server/personnel";

export async function createPersonnelAction(formData: FormData) {
  const parsed = editPersonnelSchema.safeParse({
    grado: formData.get("grado"),
    // The whole roster is stored uppercase; match it so sorting and search stay consistent.
    apellidos: String(formData.get("apellidos") ?? "").toUpperCase(),
    nombres: String(formData.get("nombres") ?? "").toUpperCase(),
    cip: formData.get("cip"),
    dni: formData.get("dni"),
    pagado: formData.get("pagado") === "on",
  });

  if (!parsed.success) {
    redirect(
      `/admin/personal/nuevo?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Revisa los campos obligatorios.")}`,
    );
  }

  const result = await createPersonnel(parsed.data);
  if (!result.ok) {
    redirect(
      `/admin/personal/nuevo?error=${encodeURIComponent(result.error.message)}`,
    );
  }

  redirect(`/admin/personal/${result.data.id}?saved=1`);
}
