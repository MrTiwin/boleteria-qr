"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

// Mirrors src/server/stats.ts's AttendanceRow — not imported directly, because src/components/**
// must never import src/server/** (see CLAUDE.md's Boundaries table). The dashboard page (a
// server component) reads the real type and passes plain data down as props.
type AttendanceRow = {
  personnelId: string;
  grado: string;
  apellidos: string;
  nombres: string;
  cip: string;
  pagado: boolean;
  status: "sin-registrar" | "issued" | "verified";
  verifiedAt: Date | null;
};

type StatsResponse =
  | { ok: true; data: { verified: number; total: number } }
  | { ok: false; error: { code: string; message: string } };

const POLL_INTERVAL_MS = 5000;

async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch("/api/admin/stats");
  return response.json();
}

export function LiveAttendanceCounter() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchStats,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const verified = data?.ok ? data.data.verified : null;
  const total = data?.ok ? data.data.total : null;

  return (
    <div role="status" aria-live="polite">
      <p style={{ fontVariantNumeric: "tabular-nums" }}>
        {verified ?? "…"} / {total ?? "…"} verificados
      </p>
    </div>
  );
}

const STATUS_LABEL: Record<AttendanceRow["status"], string> = {
  verified: "Verificado",
  issued: "Pendiente",
  "sin-registrar": "Sin registrar",
};

export function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  const [statusFilter, setStatusFilter] = useState<
    AttendanceRow["status"] | "all"
  >("all");
  const [query, setQuery] = useState("");

  const filtered = rows.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (query) {
      const haystack =
        `${row.apellidos} ${row.nombres} ${row.cip}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div>
        <label htmlFor="attendance-search">Buscar</label>
        <input
          id="attendance-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre o CIP"
        />

        <label htmlFor="attendance-status">Estado</label>
        <select
          id="attendance-status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AttendanceRow["status"] | "all")
          }
        >
          <option value="all">Todos</option>
          <option value="verified">Verificado</option>
          <option value="issued">Pendiente</option>
          <option value="sin-registrar">Sin registrar</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Grado</th>
            <th>Apellidos y nombres</th>
            <th>CIP</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.personnelId}>
              <td>{row.grado}</td>
              <td>
                {row.apellidos}, {row.nombres}
              </td>
              <td style={{ fontVariantNumeric: "tabular-nums" }}>{row.cip}</td>
              <td>
                <span>{STATUS_LABEL[row.status]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
