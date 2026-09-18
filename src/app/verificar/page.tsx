import { redirect } from "next/navigation";
import { QrScanner } from "@/components/qr-scanner";
import { getStationSession } from "@/lib/station-session";

export default async function VerificarPage() {
  const session = await getStationSession();
  if (!session) {
    redirect("/verificar/login");
  }

  return (
    <main>
      <h1>Escanear ticket</h1>
      <QrScanner />
    </main>
  );
}
