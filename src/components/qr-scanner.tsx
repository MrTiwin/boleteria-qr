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
  const [initError, setInitError] = useState<string | null>(null);
  const processingRef = useRef(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The ring's animation class is applied via this ref, not via React state driving a `key`
  // (that would remount #qr-reader itself — html5-qrcode grabs that element by id once and
  // must keep the same DOM node for the life of the camera view, or it breaks). Re-adding the
  // same class name doesn't restart a CSS animation, so we force it by toggling the class off
  // and back on across two rAF ticks.
  const ringElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let scanner: Html5QrcodeScanner;
    try {
      scanner = new Html5QrcodeScanner(
        CONTAINER_ID,
        {
          fps: 8,
          qrbox: 250,
          // iOS Safari's WKWebView has a low video-memory ceiling — asking for the camera's
          // default (often 1080p+) resolution has been reported to crash the tab outright
          // ("This page couldn't load") rather than just running slowly. Capping it here keeps
          // this working across browsers instead of just the ones with more headroom.
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        },
        false,
      );
    } catch {
      setInitError(
        "No se pudo iniciar la cámara en este dispositivo. Recarga la página o prueba con otro navegador.",
      );
      return;
    }

    try {
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
              flashRing("danger");
            } else if (body.data.alreadyVerified) {
              setResult({
                status: "already-verified",
                verifiedAt: body.data.verifiedAt,
                stationLabel: body.data.stationLabel,
              });
              flashRing("danger");
            } else {
              setResult({ status: "verified" });
              flashRing("success");
            }
          } catch {
            setResult({
              status: "error",
              message:
                "No se pudo conectar. Revisa tu conexión e intenta de nuevo.",
            });
            flashRing("danger");
          } finally {
            processingRef.current = false;
          }

          clearTimerRef.current = setTimeout(
            () => setResult(null),
            RESULT_DISPLAY_MS,
          );
        },
        () => {},
      );
    } catch {
      setInitError(
        "No se pudo acceder a la cámara. Revisa los permisos del navegador e intenta de nuevo.",
      );
    }

    function flashRing(variant: "success" | "danger") {
      const el = ringElRef.current;
      if (!el) return;
      el.classList.remove("animate-ring-success", "animate-ring-danger");
      // Force a reflow so the browser registers the class removal before it's re-added —
      // otherwise it collapses into a no-op and the animation never restarts.
      void el.offsetWidth;
      el.classList.add(
        variant === "success" ? "animate-ring-success" : "animate-ring-danger",
      );
    }

    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      scanner.clear().catch(() => {});
    };
  }, []);

  if (initError) {
    return (
      <div className="mx-auto max-w-md px-4">
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"
        >
          {initError}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4">
      <div ref={ringElRef} className="rounded-xl">
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
