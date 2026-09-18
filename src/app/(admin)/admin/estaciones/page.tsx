import Link from "next/link";
import { db } from "@/db/client";
import { verificationStation } from "@/db/schema";
import {
  createStationAction,
  deactivateStationAction,
  rotateStationCodeAction,
} from "./actions";
import { CopyCodeButton } from "./copy-code-button";

export default async function EstacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ newCode?: string; label?: string }>;
}) {
  const { newCode, label } = await searchParams;
  const stations = await db.select().from(verificationStation);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-primary"
      >
        ← Volver al dashboard
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">
        Estaciones de verificación
      </h1>

      {newCode && (
        <div
          role="alert"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary bg-surface p-4 text-sm"
        >
          <p>
            Código para {label}:{" "}
            <strong className="tabular-nums">{newCode}</strong> — anótalo ahora,
            no se vuelve a mostrar.
          </p>
          <CopyCodeButton code={newCode} />
        </div>
      )}

      <form
        action={createStationAction}
        className="mt-6 flex items-end gap-2 rounded-xl border border-border bg-surface p-4"
      >
        <div className="flex-1">
          <label htmlFor="label" className="block text-sm font-medium">
            Nombre de la estación
          </label>
          <input
            id="label"
            name="label"
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition duration-150 ease-out hover:brightness-95 active:scale-[0.98]"
        >
          Crear estación
        </button>
      </form>

      <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
        {stations.map((station) => (
          <li
            key={station.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <span className="text-sm">
              {station.label} —{" "}
              <span
                className={
                  station.active ? "text-success" : "text-muted-foreground"
                }
              >
                {station.active ? "activa" : "desactivada"}
              </span>
            </span>
            <div className="flex gap-2">
              <form action={rotateStationCodeAction}>
                <input type="hidden" name="stationId" value={station.id} />
                <input type="hidden" name="label" value={station.label} />
                <button
                  type="submit"
                  className="h-9 rounded-lg border border-border bg-surface px-3 text-sm transition-colors duration-150 hover:bg-background"
                >
                  Rotar código
                </button>
              </form>
              {station.active && (
                <form action={deactivateStationAction}>
                  <input type="hidden" name="stationId" value={station.id} />
                  <button
                    type="submit"
                    className="h-9 rounded-lg border border-danger px-3 text-sm text-danger transition-colors duration-150 hover:bg-danger/10"
                  >
                    Desactivar
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
