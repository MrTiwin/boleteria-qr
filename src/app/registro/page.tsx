import { ilike, or } from "drizzle-orm";
import { db } from "@/db/client";
import { personnel } from "@/db/schema";
import { RegistroForm } from "./registro-form";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const matches = query
    ? await db
        .select()
        .from(personnel)
        .where(
          or(
            ilike(personnel.apellidos, `%${query}%`),
            ilike(personnel.nombres, `%${query}%`),
          ),
        )
        .limit(10)
    : [];

  return (
    <main>
      <h1>Registra tu ticket</h1>

      <form method="get">
        <label htmlFor="q">Apellidos y nombres</label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="Busca tu nombre"
        />
        <button type="submit">Buscar</button>
      </form>

      {query && matches.length === 0 && (
        <p>No encontramos a nadie con ese nombre en el listado.</p>
      )}

      {matches.length > 0 && (
        <ul>
          {matches.map((person) => (
            <li key={person.id}>
              {person.grado} — {person.apellidos}, {person.nombres}
            </li>
          ))}
        </ul>
      )}

      <RegistroForm />
    </main>
  );
}
