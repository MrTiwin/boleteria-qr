"use server";

import { redirect } from "next/navigation";
import { registroSchema } from "@/lib/schemas";
import { registerByCredentials } from "@/server/tickets";

export type RegistroActionState = {
  error: { code: string; message: string } | null;
};

export async function registroAction(
  _prevState: RegistroActionState,
  formData: FormData,
): Promise<RegistroActionState> {
  const parsed = registroSchema.safeParse({
    cip: formData.get("cip"),
    dni: formData.get("dni"),
    consent: formData.get("consent") === "on",
  });

  if (!parsed.success) {
    return {
      error: {
        code: "INVALID_INPUT",
        message: parsed.error.issues[0]?.message ?? "Completa CIP y DNI.",
      },
    };
  }

  const result = await registerByCredentials(parsed.data);

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/ticket/${result.data.ticketId}`);
}
