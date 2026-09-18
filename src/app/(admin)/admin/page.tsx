import { headers } from "next/headers";
import {
  AttendanceTable,
  LiveAttendanceCounter,
} from "@/components/attendance-table";
import { auth } from "@/lib/auth";
import { getAttendanceRows } from "@/server/stats";
import { adminLogoutAction } from "./logout-action";

// Protected by src/proxy.ts (matcher: /admin/:path*) and reads live DB state on every request —
// Next.js otherwise tries to prerender this at build time (it has no dynamic API of its own to
// infer that from), which fails the build outright when the database isn't reachable from the
// build environment. Caught by a real `pnpm build` run.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [rows, session] = await Promise.all([
    getAttendanceRows(),
    auth.api.getSession({ headers: await headers() }),
  ]);
  const role =
    (session?.user as { role?: string } | undefined)?.role ?? "admin";
  const isAdmin = role === "admin";

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Asistencia en vivo al almuerzo de camaradería.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <>
              <a
                href="/admin/estaciones"
                className="text-sm text-primary underline"
              >
                Estaciones
              </a>
              <a
                href="/admin/usuarios"
                className="text-sm text-primary underline"
              >
                Usuarios
              </a>
            </>
          )}
          <a
            href="/api/admin/export"
            className="h-11 rounded-lg border border-border bg-surface px-4 text-sm font-medium leading-[44px]"
          >
            Exportar CSV
          </a>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="text-sm text-muted-foreground underline-offset-2 transition-colors duration-150 hover:text-primary hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6">
        <LiveAttendanceCounter />
      </div>

      <AttendanceTable rows={rows} isAdmin={isAdmin} />
    </main>
  );
}
