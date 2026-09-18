"use client";

const PHONE = "944986558";

export function PaymentRequiredDialog({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-required-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40"
      />
      <div className="animate-pop-in relative w-full max-w-sm rounded-xl border border-danger/30 bg-surface p-6 text-center shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangleIcon className="h-7 w-7 text-danger" />
        </div>

        <h2
          id="payment-required-title"
          className="mt-4 text-lg font-semibold text-danger"
        >
          Pago pendiente
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>

        <a
          href={`tel:${PHONE}`}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger/20"
        >
          <PhoneIcon className="h-4 w-4" />
          Llamar al {PHONE}
        </a>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 h-12 w-full rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-150 hover:bg-background"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <title>Alerta</title>
      <path d="M10 3l8 14H2z" strokeLinejoin="round" />
      <path d="M10 8v4" strokeLinecap="round" />
      <circle cx="10" cy="14.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PhoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <title>Teléfono</title>
      <path
        d="M4 3h3l1.5 4-2 1.5a10 10 0 0 0 5 5l1.5-2 4 1.5v3a1 1 0 0 1-1 1C9.5 17 3 10.5 3 4a1 1 0 0 1 1-1Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
