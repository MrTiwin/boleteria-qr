const EVENT_TITLE = "ALMUERZO DE CONFRATERNIDAD DE OFICIALES SCYTE 2026";

export function EventHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      {/* biome-ignore lint/performance/noImgElement: static logo served as-is — no remote
      optimization pipeline needed, and avoids depending on next/image's sharp binary on the
      VPS deployment target. */}
      <img
        src="/logo-scyte.png"
        alt="Escudo SCYTE"
        className={`animate-fade-in ${compact ? "h-12 w-auto" : "h-20 w-auto"}`}
      />
      <h1
        className={
          compact
            ? "animate-fade-in-delay-1 text-sm font-semibold uppercase leading-snug tracking-wide text-muted-foreground"
            : "animate-fade-in-delay-1 text-balance text-xl font-semibold uppercase leading-tight tracking-wide sm:text-2xl"
        }
      >
        {EVENT_TITLE}
      </h1>
    </header>
  );
}
