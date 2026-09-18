"use client";

import { useActionState, useEffect, useState } from "react";
import { PaymentRequiredDialog } from "@/components/payment-required-dialog";
import { type RegistroActionState, registroAction } from "./actions";

const initialState: RegistroActionState = { error: null };

export function RegistroForm() {
  const [state, formAction, pending] = useActionState(
    registroAction,
    initialState,
  );
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    if (state.error?.code === "PAYMENT_REQUIRED") {
      setShowPaymentDialog(true);
    }
  }, [state.error]);

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
          pattern="[0-9]*"
          maxLength={15}
          required
          className="mt-1 h-14 w-full rounded-lg border border-border bg-background px-3 text-base tabular-nums transition-colors duration-150 focus:border-primary"
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
          pattern="[0-9]*"
          maxLength={15}
          required
          className="mt-1 h-14 w-full rounded-lg border border-border bg-background px-3 text-base tabular-nums transition-colors duration-150 focus:border-primary"
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="consent"
          className="mt-1 h-5 w-5 shrink-0"
        />
        <span>
          Entiendo que mi código QR es{" "}
          <strong className="font-medium">personal e intransferible</strong> y
          su uso indebido está sujeto a sanción.
        </span>
      </label>

      {state.error && state.error.code !== "PAYMENT_REQUIRED" && (
        <p role="alert" className="text-sm text-danger">
          {state.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-lg bg-primary px-4 font-medium text-primary-foreground transition duration-150 ease-out hover:brightness-95 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
      >
        {pending ? "Generando..." : "Generar mi ticket QR"}
      </button>

      {showPaymentDialog && state.error?.code === "PAYMENT_REQUIRED" && (
        <PaymentRequiredDialog
          message={state.error.message}
          onClose={() => setShowPaymentDialog(false)}
        />
      )}
    </form>
  );
}
