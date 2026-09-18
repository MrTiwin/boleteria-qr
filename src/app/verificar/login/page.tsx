import { StationLoginForm } from "./station-login-form";

export default function VerificarLoginPage() {
  return (
    <main>
      <h1>Verificación de asistencia</h1>
      <p>Ingresa el código de tu estación para empezar a escanear.</p>
      <StationLoginForm />
    </main>
  );
}
