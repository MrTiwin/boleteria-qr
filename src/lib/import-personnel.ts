import { db } from "@/db/client";
import { personnel } from "@/db/schema";
import {
  type PersonnelCsvRow,
  personnelCsvHeader,
  personnelCsvRowSchema,
} from "@/lib/schemas";

export type ImportError = {
  row: number;
  field?: string;
  message: string;
};

export type ImportResult =
  | { ok: true; count: number }
  | { ok: false; errors: ImportError[] };

// Minimal CSV split — the plantilla has no embedded commas or quoted fields (see
// docs/plantilla-listado-personal.csv), so a comma split is sufficient and avoids a new
// dependency for a six-column format.
function splitCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim());
}

function parseRows(csvContent: string): {
  rows: PersonnelCsvRow[];
  errors: ImportError[];
} {
  const lines = csvContent
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const errors: ImportError[] = [];
  const rows: PersonnelCsvRow[] = [];

  if (lines.length === 0) {
    return { rows, errors: [{ row: 0, message: "CSV is empty" }] };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const headerMatches =
    header.length === personnelCsvHeader.length &&
    personnelCsvHeader.every((col, i) => header[i] === col);

  if (!headerMatches) {
    return {
      rows,
      errors: [
        {
          row: 1,
          message: `Header must be exactly: ${personnelCsvHeader.join(",")}`,
        },
      ],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-indexed, header is row 1
    const cells = splitCsvLine(lines[i]);
    const candidate = Object.fromEntries(
      personnelCsvHeader.map((col, idx) => [col, cells[idx] ?? ""]),
    );
    const parsed = personnelCsvRowSchema.safeParse(candidate);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          row: rowNumber,
          field: issue.path.join(".") || undefined,
          message: issue.message,
        });
      }
      continue;
    }

    rows.push(parsed.data);
  }

  return { rows, errors };
}

function findDuplicates(
  rows: PersonnelCsvRow[],
  field: "cip" | "dni",
): ImportError[] {
  const seenAt = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for header, +1 for 1-indexing
    const key = row[field];
    const existing = seenAt.get(key) ?? [];
    existing.push(rowNumber);
    seenAt.set(key, existing);
  });

  const errors: ImportError[] = [];
  for (const [value, rowNumbers] of seenAt) {
    if (rowNumbers.length > 1) {
      errors.push({
        row: rowNumbers[0],
        field,
        message: `Duplicate ${field} "${value}" also found on row(s) ${rowNumbers.slice(1).join(", ")}`,
      });
    }
  }
  return errors;
}

export function validatePersonnelCsv(
  csvContent: string,
):
  | { ok: true; rows: PersonnelCsvRow[] }
  | { ok: false; errors: ImportError[] } {
  const { rows, errors } = parseRows(csvContent);
  const duplicateErrors = [
    ...findDuplicates(rows, "cip"),
    ...findDuplicates(rows, "dni"),
  ];
  const allErrors = [...errors, ...duplicateErrors];

  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  return { ok: true, rows };
}

// Replaces the entire `personnel` table inside one transaction — either every row lands or none
// does. Never called with an unvalidated CSV; the caller (the CLI script or the admin upload
// route) must call validatePersonnelCsv first and only pass clean rows here.
export async function importPersonnel(
  csvContent: string,
): Promise<ImportResult> {
  const validation = validatePersonnelCsv(csvContent);
  if (!validation.ok) {
    return validation;
  }

  const { rows } = validation;

  await db.transaction(async (tx) => {
    await tx.delete(personnel);
    if (rows.length > 0) {
      await tx.insert(personnel).values(
        rows.map((row) => ({
          grado: row.grado,
          apellidos: row.apellidos,
          nombres: row.nombres,
          cip: row.cip,
          dni: row.dni,
          pagado: row.pagado === "SI",
        })),
      );
    }
  });

  return { ok: true, count: rows.length };
}
