import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/db/client";
import { ticket } from "@/db/schema";
import { getPersonnelById } from "@/server/personnel";
import { resetTicketAction, updatePersonnelAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditPersonnelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; reset?: string }>;
}) {
  const { id } = await params;
  const { error, saved, reset } = await searchParams;

  const person = await getPersonnelById(id);
  if (!person) {
    notFound();
  }

  const [existingTicket] = await db
    .select()
    .from(ticket)
    .where(eq(ticket.personnelId, id));

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-primary"
      >
        ← Volver al dashboard
      </Link>

      <h1 className="mt-2 text-2xl font-semibold">Editar persona</h1>

      {saved && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success"
        >
          Cambios guardados.
        </p>
      )}
      {reset && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success"
        >
          QR restablecido — la próxima vez que se registre en /registro recibirá
          un ticket nuevo.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <form
        action={updatePersonnelAction}
        className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-surface p-6"
      >
        <input type="hidden" name="id" value={person.id} />

        <div>
          <label htmlFor="grado" className="block text-sm font-medium">
            Grado
          </label>
          <input
            id="grado"
            name="grado"
            defaultValue={person.grado}
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3"
          />
        </div>

        <div>
          <label htmlFor="apellidos" className="block text-sm font-medium">
            Apellidos
          </label>
          <input
            id="apellidos"
            name="apellidos"
            defaultValue={person.apellidos}
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3"
          />
        </div>

        <div>
          <label htmlFor="nombres" className="block text-sm font-medium">
            Nombres
          </label>
          <input
            id="nombres"
            name="nombres"
            defaultValue={person.nombres}
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3"
          />
        </div>

        <div>
          <label htmlFor="cip" className="block text-sm font-medium">
            CIP
          </label>
          <input
            id="cip"
            name="cip"
            defaultValue={person.cip}
            inputMode="numeric"
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 tabular-nums"
          />
        </div>

        <div>
          <label htmlFor="dni" className="block text-sm font-medium">
            DNI
          </label>
          <input
            id="dni"
            name="dni"
            defaultValue={person.dni}
            inputMode="numeric"
            required
            className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 tabular-nums"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="pagado"
            defaultChecked={person.pagado}
            className="h-5 w-5"
          />
          Pagado
        </label>

        <button
          type="submit"
          className="h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition duration-150 ease-out hover:brightness-95 active:scale-[0.98]"
        >
          Guardar cambios
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Ticket QR</h2>
        <div className="mt-2">
          {existingTicket ? (
            <StatusBadge
              variant={
                existingTicket.status === "verified" ? "verified" : "pending"
              }
            />
          ) : (
            <span className="text-sm text-muted-foreground">
              Todavía no se ha registrado — no tiene ticket.
            </span>
          )}
        </div>
        {existingTicket && (
          <form action={resetTicketAction} className="mt-4">
            <input type="hidden" name="id" value={person.id} />
            <button
              type="submit"
              className="h-11 rounded-lg border border-danger px-4 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger/10"
            >
              Restablecer QR
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Invalida el código actual. La persona debe volver a registrarse en
              /registro para obtener uno nuevo.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
