"use client";

import { useActionState } from "react";
import { type StationLoginActionState, stationLoginAction } from "./actions";

const initialState: StationLoginActionState = { error: null };

export function StationLoginForm() {
  const [state, formAction, pending] = useActionState(
    stationLoginAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <label htmlFor="code">Código de estación</label>
      <input id="code" name="code" autoComplete="off" required />

      {state.error && <p role="alert">{state.error.message}</p>}

      <button type="submit" disabled={pending}>
        Entrar
      </button>
    </form>
  );
}
