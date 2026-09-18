import {
  AttendanceTable,
  LiveAttendanceCounter,
} from "@/components/attendance-table";
import { getAttendanceRows } from "@/server/stats";

// Protected by src/proxy.ts (matcher: /admin/:path*) and reads live DB state on every request —
// Next.js otherwise tries to prerender this at build time (it has no dynamic API of its own to
// infer that from), which fails the build outright when the database isn't reachable from the
// build environment. Caught by a real `pnpm build` run.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const rows = await getAttendanceRows();

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-fraunces text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Asistencia en vivo al almuerzo de camaradería.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/admin/estaciones"
            className="text-sm text-primary underline"
          >
            Estaciones
          </a>
          <a
            href="/api/admin/export"
            className="h-11 rounded-lg border border-border bg-surface px-4 text-sm font-medium leading-[44px]"
          >
            Exportar CSV
          </a>
        </div>
      </div>

      <div className="mt-6">
        <LiveAttendanceCounter />
      </div>

      <AttendanceTable rows={rows} />
    </main>
  );
}
