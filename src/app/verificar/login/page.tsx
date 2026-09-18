import { EventHeader } from "@/components/event-header";
import { StationLoginForm } from "./station-login-form";

export default function VerificarLoginPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <EventHeader />

      <div className="mt-8 animate-fade-in-delay-2 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Verificación de asistencia</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa el código de tu estación para empezar a escanear.
        </p>
        <div className="mt-6">
          <StationLoginForm />
        </div>
      </div>
    </main>
  );
}
