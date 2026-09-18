import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventHeader } from "@/components/event-header";
import { TicketCard } from "@/components/ticket-card";
import { db } from "@/db/client";
import { personnel, ticket } from "@/db/schema";
import { generateQrDataUrl } from "@/lib/qr-image";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rows = await db
    .select({ ticket, personnel })
    .from(ticket)
    .innerJoin(personnel, eq(ticket.personnelId, personnel.id))
    .where(eq(ticket.id, id));

  const row = rows[0];
  if (!row) {
    notFound();
  }

  const qrDataUrl = await generateQrDataUrl(row.ticket.qrToken);

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <EventHeader compact />
      <h2 className="mt-4 text-center text-lg font-semibold">Tu ticket</h2>
      <div className="mt-6">
        <TicketCard
          ticketId={row.ticket.id}
          qrDataUrl={qrDataUrl}
          grado={row.personnel.grado}
          apellidos={row.personnel.apellidos}
          nombres={row.personnel.nombres}
          cip={row.personnel.cip}
        />
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/mi-ticket"
          className="text-sm text-muted-foreground underline-offset-2 transition-colors duration-150 hover:text-primary hover:underline"
        >
          ← Volver a buscar mi ticket
        </Link>
      </div>
    </main>
  );
}
