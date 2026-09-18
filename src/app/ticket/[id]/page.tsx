import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
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
      {/* biome-ignore lint/performance/noImgElement: a QR data URL generated server-side per request isn't a candidate for next/image's remote optimization pipeline. */}
      <img
        src={qrDataUrl}
        alt={`Código QR del ticket de ${row.personnel.nombres} ${row.personnel.apellidos}`}
        width={480}
        height={480}
      />
      <p>
        {row.personnel.grado} — {row.personnel.apellidos},{" "}
        {row.personnel.nombres}
      </p>
      <p>CIP {row.personnel.cip}</p>
      <p role="alert">Código personal e intransferible bajo sanción.</p>
    </main>
  );
}
