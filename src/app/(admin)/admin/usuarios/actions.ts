"use server";

import { redirect } from "next/navigation";
import { createHostUserSchema } from "@/lib/schemas";
import { createHostUser, deleteHostUser } from "@/server/users";

export async function createHostUserAction(formData: FormData) {
  const parsed = createHostUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    redirect(
      `/admin/usuarios?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Nombre y correo son obligatorios.")}`,
    );
  }

  const result = await createHostUser(parsed.data.name, parsed.data.email);
  if (!result.ok) {
    redirect(
      `/admin/usuarios?error=${encodeURIComponent(result.error.message)}`,
    );
  }

  redirect(
    `/admin/usuarios?newPassword=${encodeURIComponent(result.data.password)}&email=${encodeURIComponent(parsed.data.email)}`,
  );
}

export async function deleteHostUserAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  await deleteHostUser(userId);
  redirect("/admin/usuarios");
}
