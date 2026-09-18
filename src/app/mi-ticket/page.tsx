import { MiTicketForm } from "./mi-ticket-form";

export default function MiTicketPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <h1 className="text-xl">Buscar mi ticket</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ya me registré, quiero volver a ver mi ticket.
      </p>
      <div className="mt-6">
        <MiTicketForm />
      </div>
    </main>
  );
}
