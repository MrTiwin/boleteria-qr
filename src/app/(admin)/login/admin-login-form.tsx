"use client";

import { useActionState, useState } from "react";
import { type AdminLoginActionState, adminLoginAction } from "./actions";

const initialState: AdminLoginActionState = { error: null };

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(
    adminLoginAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-14 w-full rounded-lg border border-border bg-surface px-3 pr-14 text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={
              showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
            }
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-primary"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
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

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6Z" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" />
      <path d="M2.5 2.5l15 15" strokeLinecap="round" />
    </svg>
  );
}
