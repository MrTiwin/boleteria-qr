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
    <div className="mx-auto max-w-md">
      <div
        ref={cardRef}
        className="rounded-xl border border-border bg-surface p-6 text-center"
      >
        {/* biome-ignore lint/performance/noImgElement: a QR data URL generated server-side per request isn't a candidate for next/image's remote optimization pipeline. */}
        <img
          src={qrDataUrl}
          alt={`Código QR del ticket de ${nombres} ${apellidos}`}
          width={480}
          height={480}
          className="mx-auto h-auto w-full max-w-72"
        />
        <p className="mt-4 font-medium">
          {grado} — {apellidos}, {nombres}
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">CIP {cip}</p>
        <p
          role="alert"
          className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-2 text-sm text-danger"
        >
          Código personal e intransferible bajo sanción.
        </p>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="mt-4 h-14 w-full rounded-lg bg-primary px-4 font-medium text-primary-foreground disabled:opacity-60"
      >
        {downloading ? "Descargando..." : "Descargar como imagen"}
      </button>
    </div>
  );
}
