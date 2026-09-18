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
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="code" className="block text-sm font-medium">
          Código de estación
        </label>
        <input
          id="code"
          name="code"
          autoComplete="off"
          maxLength={30}
          required
          className="mt-1 h-14 w-full rounded-lg border border-border bg-background px-3 text-base transition-colors duration-150 focus:border-primary"
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
        className="h-14 rounded-lg bg-primary px-4 font-medium text-primary-foreground transition duration-150 ease-out hover:brightness-95 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
      >
        Entrar
      </button>
    </form>
  );
}
