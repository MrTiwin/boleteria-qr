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
    <main>
      <h1>Dashboard</h1>
      <a href="/api/admin/export">Exportar CSV</a>
      <LiveAttendanceCounter />
      <AttendanceTable rows={rows} />
    </main>
  );
}
