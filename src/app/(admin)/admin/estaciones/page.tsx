import { db } from "@/db/client";
import { verificationStation } from "@/db/schema";
import {
  createStationAction,
  deactivateStationAction,
  rotateStationCodeAction,
} from "./actions";

export default async function EstacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ newCode?: string; label?: string }>;
}) {
  const { newCode, label } = await searchParams;
  const stations = await db.select().from(verificationStation);

  return (
    <main>
      <h1>Estaciones de verificación</h1>

      {newCode && (
        <p role="alert">
          Código para {label}: <strong>{newCode}</strong> — anótalo ahora, no se
          vuelve a mostrar.
        </p>
      )}

      <form action={createStationAction}>
        <label htmlFor="label">Nombre de la estación</label>
        <input id="label" name="label" required />
        <button type="submit">Crear estación</button>
      </form>

      <ul>
        {stations.map((station) => (
          <li key={station.id}>
            {station.label} — {station.active ? "activa" : "desactivada"}
            <form
              action={rotateStationCodeAction}
              style={{ display: "inline" }}
            >
              <input type="hidden" name="stationId" value={station.id} />
              <input type="hidden" name="label" value={station.label} />
              <button type="submit">Rotar código</button>
            </form>
            {station.active && (
              <form
                action={deactivateStationAction}
                style={{ display: "inline" }}
              >
                <input type="hidden" name="stationId" value={station.id} />
                <button type="submit">Desactivar</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
