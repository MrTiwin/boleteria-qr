import { redirect } from "next/navigation";
import { EventHeader } from "@/components/event-header";
import { QrScanner } from "@/components/qr-scanner";
import { getStationSession } from "@/lib/station-session";
import { getStationSummary } from "@/server/stations";
import { stationLogoutAction } from "./actions";

// Reads live counts on every request — never prerender this.
export const dynamic = "force-dynamic";

export default async function VerificarPage() {
  const session = await getStationSession();
  if (!session) {
    redirect("/verificar/login");
  }

  // A station that was deleted while its session cookie was still valid has nothing to show.
  const station = await getStationSummary(session.stationId);
  if (!station) {
    redirect("/verificar/login");
  }

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto max-w-md">
        <form action={stationLogoutAction} className="flex justify-end">
          <button
            type="submit"
            className="text-sm text-muted-foreground underline-offset-2 transition-colors duration-150 hover:text-primary hover:underline"
          >
            Salir
          </button>
        </form>
        <EventHeader compact />
        <h2 className="mt-4 text-lg font-semibold">Escanear ticket</h2>
      </div>
      <div className="mt-4">
        <QrScanner
          stationLabel={station.label}
          initialScanCount={station.scans}
        />
      </div>
    </main>
  );
}
