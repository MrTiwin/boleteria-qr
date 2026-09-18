import { AdminLoginForm } from "./admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <h1 className="font-fraunces text-2xl font-semibold">
        Panel de administración
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ingresa con tu correo y contraseña de administrador.
      </p>
      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <AdminLoginForm />
      </div>
    </main>
  );
}
