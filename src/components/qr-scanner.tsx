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
// How long a result stays on screen before the panel clears itself, so the frame looks
// "ready" again for the next scan instead of showing a stale result indefinitely.
const RESULT_DISPLAY_MS = 3500;

export function QrScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [ring, setRing] = useState<"success" | "danger" | null>(null);
  const processingRef = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

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
            setRing("danger");
          } else if (body.data.alreadyVerified) {
            setResult({
              status: "already-verified",
              verifiedAt: body.data.verifiedAt,
              stationLabel: body.data.stationLabel,
            });
            setRing("danger");
          } else {
            setResult({ status: "verified" });
            setRing("success");
          }

          clearTimerRef.current = setTimeout(() => {
            setResult(null);
            setRing(null);
          }, RESULT_DISPLAY_MS);
        } finally {
          processingRef.current = false;
        }
      },
      () => {},
    );

    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="mx-auto max-w-md px-4">
      {/* The ring animation lives on this wrapper, keyed to retrigger on each scan — never on
      the #qr-reader div itself, which html5-qrcode grabs by id once and must stay the same DOM
      node for the life of the component, or the camera view breaks. */}
      <div
        key={ring ?? "idle"}
        className={`rounded-xl ${
          ring === "success"
            ? "animate-ring-success"
            : ring === "danger"
              ? "animate-ring-danger"
              : ""
        }`}
      >
        <div
          id={CONTAINER_ID}
          className="overflow-hidden rounded-xl border border-border"
        />
      </div>

      <div className="mt-4 min-h-14" aria-live="assertive">
        {result?.status === "verified" && (
          <div
            role="alert"
            className="animate-pop-in flex min-h-14 items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4"
          >
            <StatusBadge variant="verified" />
          </div>
        )}
        {result?.status === "already-verified" && (
          <div
            role="alert"
            className="animate-pop-in flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-danger/30 bg-danger/10 p-4"
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
            className="animate-pop-in flex min-h-14 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger"
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
