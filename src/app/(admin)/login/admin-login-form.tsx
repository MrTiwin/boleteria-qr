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
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="mt-1 h-14 w-full rounded-lg border border-border bg-surface px-3 text-base"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 h-14 w-full rounded-lg border border-border bg-surface px-3 text-base"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-lg bg-primary px-4 font-medium text-primary-foreground disabled:opacity-60"
      >
        Entrar
      </button>
    </form>
  );
}
