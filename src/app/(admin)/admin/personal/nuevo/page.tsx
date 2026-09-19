import Link from "next/link";
import { GRADO_ORDER } from "@/lib/grados";
import { createPersonnelAction } from "./actions";

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-border bg-background px-3";

export default async function NewPersonnelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-primary"
      >
        ← Volver al dashboard
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">Agregar persona</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Se suma al listado y podrá registrarse en /registro con su CIP y DNI.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <form
        action={createPersonnelAction}
        className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-6"
      >
        <div>
          <label htmlFor="grado" className="block text-sm font-medium">
            Grado
          </label>
          <select id="grado" name="grado" required className={inputClass}>
            {GRADO_ORDER.map((grado) => (
              <option key={grado} value={grado}>
                {grado}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="apellidos" className="block text-sm font-medium">
            Apellidos
          </label>
          <input
            id="apellidos"
            name="apellidos"
            maxLength={100}
            required
            className={`${inputClass} uppercase`}
          />
        </div>

        <div>
          <label htmlFor="nombres" className="block text-sm font-medium">
            Nombres
          </label>
          <input
            id="nombres"
            name="nombres"
            maxLength={100}
            required
            className={`${inputClass} uppercase`}
          />
        </div>

        <div>
          <label htmlFor="cip" className="block text-sm font-medium">
            CIP
          </label>
          <input
            id="cip"
            name="cip"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={15}
            required
            className={`${inputClass} tabular-nums`}
          />
        </div>

        <div>
          <label htmlFor="dni" className="block text-sm font-medium">
            DNI
          </label>
          <input
            id="dni"
            name="dni"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={15}
            required
            className={`${inputClass} tabular-nums`}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="pagado" className="h-5 w-5" />
          Pagado
        </label>

        <button
          type="submit"
          className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition duration-150 ease-out hover:brightness-95 active:scale-[0.98]"
        >
          Agregar persona
        </button>
      </form>
    </main>
  );
}
