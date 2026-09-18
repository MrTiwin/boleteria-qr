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
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="cip" className="block text-sm font-medium">
          CIP
        </label>
        <input
          id="cip"
          name="cip"
          inputMode="numeric"
          required
          className="mt-1 h-14 w-full rounded-lg border border-border bg-surface px-3 text-base tabular-nums"
        />
      </div>

      <div>
        <label htmlFor="dni" className="block text-sm font-medium">
          DNI
        </label>
        <input
          id="dni"
          name="dni"
          inputMode="numeric"
          required
          className="mt-1 h-14 w-full rounded-lg border border-border bg-surface px-3 text-base tabular-nums"
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
        {pending ? "Buscando..." : "Buscar mi ticket"}
      </button>
    </form>
  );
}
