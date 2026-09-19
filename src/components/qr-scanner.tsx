"use client";

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/status-badge";

type VerifiedPerson = {
  grado: string;
  apellidos: string;
  nombres: string;
  cip: string;
  pagado: boolean;
};

type ScanResult =
  | { status: "verified"; person: VerifiedPerson }
  | {
      status: "already-verified";
      verifiedAt: string | null;
      stationLabel: string | null;
      person: VerifiedPerson;
    }
  | { status: "error"; message: string };

const CONTAINER_ID = "qr-reader";

export function QrScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const processingRef = useRef(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
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
      scannerRef.current = scanner;
    } catch {
      setInitError(
        "No se pudo iniciar la cámara en este dispositivo. Recarga la página o prueba con otro navegador.",
      );
      return;
    }

    try {
      scanner.render(
        async (decodedText) => {
          // pause(true) freezes the video feed itself, so this guard against a second decode
          // firing before the pause takes effect (or before the UI has re-rendered) — without
          // it, a shaky hand between the scan and the pause landing could scan a second code and
          // silently overwrite the first result before anyone reads it.
          if (processingRef.current) return;
          processingRef.current = true;
          scanner.pause(true);

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
                person: body.data.person,
              });
              flashRing("danger");
            } else {
              setResult({ status: "verified", person: body.data.person });
              flashRing("success");
            }
          } catch {
            setResult({
              status: "error",
              message:
                "No se pudo conectar. Revisa tu conexión e intenta de nuevo.",
            });
            flashRing("danger");
          }
          // Deliberately no auto-clear/auto-resume here — the camera stays paused and the
          // result stays on screen until the operator taps "Nuevo escaneo" below. That's the
          // fix for "se mueve la cámara y ya escaneó otro": nothing scans again until asked to.
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
      scanner.clear().catch(() => {});
    };
  }, []);

  function handleNewScan() {
    setResult(null);
    processingRef.current = false;
    scannerRef.current?.resume();
  }

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
      <div className="animate-fade-in-delay-1 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="mb-3 text-center text-sm text-muted-foreground">
          {result
            ? "Cámara en pausa — revisa el resultado abajo"
            : "Apunta la cámara al código QR del ticket"}
        </p>
        <div ref={ringElRef} className="rounded-xl">
          <div
            id={CONTAINER_ID}
            className="overflow-hidden rounded-xl border border-border"
          />
        </div>
      </div>

      <div className="mt-4" aria-live="assertive">
        {result?.status === "verified" && (
          <div
            role="alert"
            className="animate-pop-in flex flex-col items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4"
          >
            <StatusBadge variant="verified" />
            <PersonSummary person={result.person} />
          </div>
        )}
        {result?.status === "already-verified" && (
          <div
            role="alert"
            className="animate-pop-in flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4"
          >
            <StatusBadge variant="danger" />
            <PersonSummary person={result.person} />
            {result.stationLabel && (
              <p className="text-sm text-muted-foreground">
                Ya fue verificado antes en {result.stationLabel}
              </p>
            )}
          </div>
        )}
        {result?.status === "error" && (
          <div
            role="alert"
            className="animate-pop-in flex min-h-14 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 p-4 text-center text-danger"
          >
            {result.message}
          </div>
        )}

        {result && (
          <button
            type="button"
            onClick={handleNewScan}
            className="animate-fade-in mt-4 h-14 w-full rounded-lg bg-primary px-4 font-medium text-primary-foreground transition duration-150 ease-out hover:brightness-95 active:scale-[0.98]"
          >
            Nuevo escaneo
          </button>
        )}
      </div>
    </div>
  );
}

// Shown on every successful scan (first-time and already-used alike) — the station needs to see
// whose ticket this is to check it against the person standing in front of them, not just a
// pass/fail badge.
function PersonSummary({ person }: { person: VerifiedPerson }) {
  return (
    <div className="animate-fade-in-delay-1 text-center">
      <p className="font-medium">
        {person.grado} — {person.apellidos}, {person.nombres}
      </p>
      <p className="text-sm tabular-nums text-muted-foreground">
        CIP {person.cip}
      </p>
      <div className="mt-2 flex justify-center">
        <StatusBadge variant={person.pagado ? "paid" : "unpaid"} />
      </div>
    </div>
  );
}
