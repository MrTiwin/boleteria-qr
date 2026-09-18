"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

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
    <div>
      <div id={CONTAINER_ID} />
      {result?.status === "verified" && <p role="alert">Verificado</p>}
      {result?.status === "already-verified" && (
        <p role="alert">
          Ya verificado antes
          {result.stationLabel ? ` en ${result.stationLabel}` : ""}.
        </p>
      )}
      {result?.status === "error" && <p role="alert">{result.message}</p>}
    </div>
  );
}
