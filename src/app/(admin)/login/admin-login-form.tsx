"use client";

import { useActionState } from "react";
import { type AdminLoginActionState, adminLoginAction } from "./actions";

const initialState: AdminLoginActionState = { error: null };

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(
    adminLoginAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <label htmlFor="email">Correo</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
      />

      <label htmlFor="password">Contraseña</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      {state.error && <p role="alert">{state.error.message}</p>}

      <button type="submit" disabled={pending}>
        Entrar
      </button>
    </form>
  );
}
