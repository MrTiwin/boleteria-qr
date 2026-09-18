"use server";

import { redirect } from "next/navigation";
import { registroSchema } from "@/lib/schemas";
import { lookupTicketByCredentials } from "@/server/rate-limit";

export type MiTicketActionState = {
  error: { code: string; message: string } | null;
};

export async function miTicketAction(
  _prevState: MiTicketActionState,
  formData: FormData,
): Promise<MiTicketActionState> {
  const parsed = registroSchema.omit({ consent: true }).safeParse({
    cip: formData.get("cip"),
    dni: formData.get("dni"),
  });

  if (!parsed.success) {
    return { error: { code: "INVALID_INPUT", message: "Completa CIP y DNI." } };
  }

  const result = await lookupTicketByCredentials(
    parsed.data.cip,
    parsed.data.dni,
  );

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/ticket/${result.data.ticketId}`);
}
