import { ilike, or } from "drizzle-orm";
import { EventHeader } from "@/components/event-header";
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
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <EventHeader />

      <div className="mt-8 animate-fade-in-delay-2 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Registra tu ticket</h2>

        <form method="get" className="mt-4 flex gap-2">
          <div className="flex-1">
            <label htmlFor="q" className="block text-sm font-medium">
              Apellidos y nombres
            </label>
            <input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Busca tu nombre"
              className="mt-1 h-14 w-full rounded-lg border border-border bg-background px-3 text-base transition-colors duration-150 focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="mt-6 h-14 rounded-lg border border-border bg-background px-4 font-medium transition-colors duration-150 hover:bg-border/40 active:scale-[0.98]"
          >
            Buscar
          </button>
        </form>

        {query && matches.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            No encontramos a nadie con ese nombre en el listado.
          </p>
        )}

        {matches.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2">
            {matches.map((person) => (
              <li
                key={person.id}
                className="rounded-lg border border-border bg-background p-3 text-sm transition-colors duration-150 hover:border-primary"
              >
                {person.grado} — {person.apellidos}, {person.nombres}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <RegistroForm />
        </div>
      </div>
    </main>
  );
}
