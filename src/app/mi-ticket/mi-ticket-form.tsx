"use client";

import { useActionState } from "react";
import { type MiTicketActionState, miTicketAction } from "./actions";

const initialState: MiTicketActionState = { error: null };

export function MiTicketForm() {
  const [state, formAction, pending] = useActionState(
    miTicketAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <label htmlFor="cip">CIP</label>
      <input id="cip" name="cip" inputMode="numeric" required />

      <label htmlFor="dni">DNI</label>
      <input id="dni" name="dni" inputMode="numeric" required />

      {state.error && <p role="alert">{state.error.message}</p>}

      <button type="submit" disabled={pending}>
        Buscar mi ticket
      </button>
    </form>
  );
}
