import { BackHomeLink } from "@/components/back-home-link";
import { EventHeader } from "@/components/event-header";
import { RegistroForm } from "./registro-form";

export default function RegistroPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <BackHomeLink />
      <div className="mt-4">
        <EventHeader />
      </div>

      <div className="mt-8 animate-fade-in-delay-2 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Registra tu ticket</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa tu CIP y DNI para generar tu ticket QR.
        </p>

        <div className="mt-6">
          <RegistroForm />
        </div>
      </div>
    </main>
  );
}
