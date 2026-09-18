import { redirect } from "next/navigation";
import { EventHeader } from "@/components/event-header";
import { QrScanner } from "@/components/qr-scanner";
import { getStationSession } from "@/lib/station-session";

export default async function VerificarPage() {
  const session = await getStationSession();
  if (!session) {
    redirect("/verificar/login");
  }

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto max-w-md">
        <EventHeader compact />
        <h2 className="mt-4 text-lg font-semibold">Escanear ticket</h2>
      </div>
      <div className="mt-4">
        <QrScanner />
      </div>
    </main>
  );
}
