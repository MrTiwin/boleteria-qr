import { AdminLoginForm } from "./admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      {/* biome-ignore lint/performance/noImgElement: static logo, see event-header.tsx. */}
      <img
        src="/logo-scyte.png"
        alt="Escudo SCYTE"
        className="mx-auto h-14 w-auto"
      />
      <h1 className="mt-3 text-center font-fraunces text-2xl font-semibold">
        Panel de administración
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Ingresa con tu correo y contraseña de administrador.
      </p>
      <div className="mt-6 animate-fade-in-delay-2 rounded-xl border border-border bg-surface p-6">
        <AdminLoginForm />
      </div>
    </main>
  );
}
