import "server-only";
import { getAttendanceRows } from "@/server/stats";

const HEADER = "grado,apellidos,nombres,cip,pagado,status,verified_at";

function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function buildAttendanceCsv(): Promise<string> {
  const rows = await getAttendanceRows();

  const lines = rows.map((row) =>
    [
      row.grado,
      row.apellidos,
      row.nombres,
      row.cip,
      row.pagado ? "SI" : "NO",
      row.status,
      row.verifiedAt ? row.verifiedAt.toISOString() : "",
    ]
      .map(csvField)
      .join(","),
  );

  return `${[HEADER, ...lines].join("\n")}\n`;
}
