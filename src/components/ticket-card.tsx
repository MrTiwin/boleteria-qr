"use client";

import { toPng } from "html-to-image";
import { useRef, useState } from "react";

export function TicketCard({
  ticketId,
  qrDataUrl,
  grado,
  apellidos,
  nombres,
  cip,
}: {
  ticketId: string;
  qrDataUrl: string;
  grado: string;
  apellidos: string;
  nombres: string;
  cip: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current);

      const link = document.createElement("a");
      link.download = `ticket-${cip}.png`;
      link.href = dataUrl;
      link.click();

      await fetch(`/api/tickets/${ticketId}/download`, { method: "POST" });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div ref={cardRef}>
        {/* biome-ignore lint/performance/noImgElement: a QR data URL generated server-side per request isn't a candidate for next/image's remote optimization pipeline. */}
        <img
          src={qrDataUrl}
          alt={`Código QR del ticket de ${nombres} ${apellidos}`}
          width={480}
          height={480}
        />
        <p>
          {grado} — {apellidos}, {nombres}
        </p>
        <p>CIP {cip}</p>
        <p role="alert">Código personal e intransferible bajo sanción.</p>
      </div>

      <button type="button" onClick={handleDownload} disabled={downloading}>
        {downloading ? "Descargando..." : "Descargar como imagen"}
      </button>
    </div>
  );
}
