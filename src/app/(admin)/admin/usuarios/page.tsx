import Link from "next/link";
import { CopyCodeButton } from "@/components/copy-code-button";
import { listHostUsers } from "@/server/users";
import { createHostUserAction, deleteHostUserAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{
    newPassword?: string;
    email?: string;
    error?: string;
  }>;
}) {
  const { newPassword, email, error } = await searchParams;
  const hosts = await listHostUsers();

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-primary"
      >
        ← Volver al dashboard
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">Usuarios anfitrión</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Un anfitrión puede ver el dashboard de asistencia, pero no gestionar
        estaciones ni otros usuarios.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}

      {newPassword && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary bg-surface p-4 text-sm"
        >
          <p>
            Contraseña para {email}:{" "}
            <strong className="tabular-nums">{newPassword}</strong> — anótala
            ahora, no se vuelve a mostrar.
          </p>
          <CopyCodeButton code={newPassword} />
        </div>
      )}

      <form
        action={createHostUserAction}
        className="mt-6 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-4"
      >
        <div className="flex-1">
          <label htmlFor="name" className="block text-sm font-medium">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="email" className="block text-sm font-medium">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition duration-150 ease-out hover:brightness-95 active:scale-[0.98]"
        >
          Crear anfitrión
        </button>
      </form>

      <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
        {hosts.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            No hay usuarios anfitrión todavía.
          </li>
        )}
        {hosts.map((hostUser) => (
          <li
            key={hostUser.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <span className="text-sm">
              {hostUser.name} — {hostUser.email}
            </span>
            <form action={deleteHostUserAction}>
              <input type="hidden" name="userId" value={hostUser.id} />
              <button
                type="submit"
                className="h-9 rounded-lg border border-danger px-3 text-sm text-danger transition-colors duration-150 hover:bg-danger/10"
              >
                Eliminar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
