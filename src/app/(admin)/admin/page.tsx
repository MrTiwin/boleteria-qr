import {
  AttendanceTable,
  LiveAttendanceCounter,
} from "@/components/attendance-table";
import { getAttendanceRows } from "@/server/stats";

export default async function AdminDashboardPage() {
  const rows = await getAttendanceRows();

  return (
    <main>
      <h1>Dashboard</h1>
      <LiveAttendanceCounter />
      <AttendanceTable rows={rows} />
    </main>
  );
}
