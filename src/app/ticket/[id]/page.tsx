import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
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
    <main>
      <h1>Tu ticket</h1>
      <TicketCard
        ticketId={row.ticket.id}
        qrDataUrl={qrDataUrl}
        grado={row.personnel.grado}
        apellidos={row.personnel.apellidos}
        nombres={row.personnel.nombres}
        cip={row.personnel.cip}
      />
    </main>
  );
}
