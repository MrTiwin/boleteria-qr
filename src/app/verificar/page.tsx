import { redirect } from "next/navigation";
import { QrScanner } from "@/components/qr-scanner";
import { getStationSession } from "@/lib/station-session";

export default async function VerificarPage() {
  const session = await getStationSession();
  if (!session) {
    redirect("/verificar/login");
  }

  return (
    <main className="min-h-dvh px-4 py-8">
      <h1 className="mx-auto max-w-md text-xl">Escanear ticket</h1>
      <div className="mt-4">
        <QrScanner />
      </div>
    </main>
  );
}
