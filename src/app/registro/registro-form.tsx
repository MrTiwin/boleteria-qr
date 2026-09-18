"use client";

import { useActionState } from "react";
import { type RegistroActionState, registroAction } from "./actions";

const initialState: RegistroActionState = { error: null };

export function RegistroForm() {
  const [state, formAction, pending] = useActionState(
    registroAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <label htmlFor="cip">CIP</label>
      <input id="cip" name="cip" inputMode="numeric" required />

      <label htmlFor="dni">DNI</label>
      <input id="dni" name="dni" inputMode="numeric" required />

      <label>
        <input type="checkbox" name="consent" />
        Entiendo que mi código QR es personal e intransferible y su uso indebido
        está sujeto a sanción.
      </label>

      {state.error && <p role="alert">{state.error.message}</p>}

      <button type="submit" disabled={pending}>
        Generar mi ticket QR
      </button>
    </form>
  );
}
