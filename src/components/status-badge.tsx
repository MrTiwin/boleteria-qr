const VARIANTS = {
  verified: {
    label: "Verificado",
    className: "bg-success/10 text-success border-success/30",
    Icon: CheckIcon,
  },
  pending: {
    label: "Registrado",
    className: "bg-primary/10 text-primary border-primary/30",
    Icon: ClockIcon,
  },
  unregistered: {
    label: "Sin registrar",
    className: "bg-secondary/10 text-secondary border-secondary/30",
    Icon: DashIcon,
  },
  danger: {
    label: "Ya usado",
    className: "bg-danger/10 text-danger border-danger/30",
    Icon: AlertIcon,
  },
  paid: {
    label: "Pagado",
    className: "bg-success/10 text-success border-success/30",
    Icon: CoinIcon,
  },
  unpaid: {
    label: "Debe",
    className: "bg-danger/10 text-danger border-danger/30",
    Icon: AlertIcon,
  },
} as const;

export type StatusBadgeVariant = keyof typeof VARIANTS;

// Color + icon + text, always together — never color alone (WCAG 1.4.1, and
// .claude/rules/styling.md). A color-blind station staffer must be able to tell "verificado" from
// "ya usado" from the icon and label alone.
export function StatusBadge({
  variant,
  label,
}: {
  variant: StatusBadgeVariant;
  label?: string;
}) {
  const { label: defaultLabel, className, Icon } = VARIANTS[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${className}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label ?? defaultLabel}
    </span>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <title>Verificado</title>
      <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <title>Pendiente</title>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <title>Sin registrar</title>
      <circle cx="10" cy="10" r="7" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

function CoinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      {...props}
    >
      <title>Pagado</title>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v7M8 12.5c0 .83.9 1.5 2 1.5s2-.67 2-1.5-.9-1.3-2-1.5-2-.67-2-1.5.9-1.5 2-1.5 2 .67 2 1.5" />
    </svg>
  );
}

function AlertIcon(props: React.SVGProps<SVGSVGElement>) {
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
