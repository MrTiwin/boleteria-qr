import Link from "next/link";
import { EventHeader } from "@/components/event-header";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <EventHeader />

      <div className="mt-10 flex flex-col gap-4">
        <Link
          href="/registro"
          className="flex h-16 items-center justify-center rounded-xl bg-primary px-4 text-lg font-medium text-primary-foreground transition duration-150 ease-out hover:brightness-95 active:scale-[0.98]"
        >
          Registrarme
        </Link>
        <Link
          href="/verificar/login"
          className="flex h-16 items-center justify-center rounded-xl border border-border bg-surface px-4 text-lg font-medium transition-colors duration-150 hover:bg-background"
        >
          Escanear (estación)
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya te registraste?{" "}
        <Link
          href="/mi-ticket"
          className="text-primary underline underline-offset-2"
        >
          Ver mi ticket
        </Link>
      </p>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        <Link
          href="/login"
          className="underline underline-offset-2 transition-colors duration-150 hover:text-primary"
        >
          Acceso administrativo
        </Link>
      </p>
    </main>
  );
}
