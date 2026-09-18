"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";

type ScanResult =
  | { status: "verified" }
  | {
      status: "already-verified";
      verifiedAt: string | null;
      stationLabel: string | null;
    }
  | { status: "error"; message: string };

const CONTAINER_ID = "qr-reader";

export function QrScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      CONTAINER_ID,
      { fps: 10, qrbox: 250 },
      false,
    );

    scanner.render(
      async (decodedText) => {
        if (processingRef.current) return;
        processingRef.current = true;
        try {
          const response = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: decodedText }),
          });
          const body = await response.json();

          if (!body.ok) {
            setResult({
              status: "error",
              message: body.error?.message ?? "Error al verificar.",
            });
          } else if (body.data.alreadyVerified) {
            setResult({
              status: "already-verified",
              verifiedAt: body.data.verifiedAt,
              stationLabel: body.data.stationLabel,
            });
          } else {
            setResult({ status: "verified" });
          }
        } finally {
          processingRef.current = false;
        }
      },
      () => {},
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="mx-auto max-w-md px-4">
      <div
        id={CONTAINER_ID}
        className="overflow-hidden rounded-xl border border-border"
      />

      <div className="mt-4 min-h-14" aria-live="assertive">
        {result?.status === "verified" && (
          <div
            role="alert"
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4"
          >
            <StatusBadge variant="verified" />
          </div>
        )}
        {result?.status === "already-verified" && (
          <div
            role="alert"
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-danger/30 bg-danger/10 p-4"
          >
            <StatusBadge variant="danger" />
            {result.stationLabel && (
              <p className="text-sm text-muted-foreground">
                Verificado antes en {result.stationLabel}
              </p>
            )}
          </div>
        )}
        {result?.status === "error" && (
          <div
            role="alert"
            className="flex min-h-14 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger"
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
