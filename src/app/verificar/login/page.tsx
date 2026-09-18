import { StationLoginForm } from "./station-login-form";

export default function VerificarLoginPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <h1 className="text-xl">Verificación de asistencia</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ingresa el código de tu estación para empezar a escanear.
      </p>
      <div className="mt-6">
        <StationLoginForm />
      </div>
    </main>
  );
}
