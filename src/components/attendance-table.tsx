"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  StatusBadge,
  type StatusBadgeVariant,
} from "@/components/status-badge";

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
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-border bg-surface p-4"
    >
      <p className="text-sm text-muted-foreground">Verificados en vivo</p>
      <p className="text-3xl font-semibold tabular-nums">
        {verified ?? "…"} / {total ?? "…"}
      </p>
    </div>
  );
}

const ROW_STATUS_VARIANT: Record<AttendanceRow["status"], StatusBadgeVariant> =
  {
    verified: "verified",
    issued: "pending",
    "sin-registrar": "pending",
  };

const ROW_STATUS_LABEL: Record<AttendanceRow["status"], string> = {
  verified: "Verificado",
  issued: "Pendiente",
  "sin-registrar": "Sin registrar",
};

export function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  const [statusFilter, setStatusFilter] = useState<
    AttendanceRow["status"] | "all"
  >("all");
  const [gradoFilter, setGradoFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const grados = [...new Set(rows.map((row) => row.grado))].sort();

  const filtered = rows.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (gradoFilter !== "all" && row.grado !== gradoFilter) return false;
    if (query) {
      const haystack =
        `${row.apellidos} ${row.nombres} ${row.cip}`.toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor="attendance-search"
            className="block text-sm font-medium"
          >
            Buscar
          </label>
          <input
            id="attendance-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o CIP"
            className="mt-1 h-11 rounded-lg border border-border bg-surface px-3"
          />
        </div>

        <div>
          <label
            htmlFor="attendance-status"
            className="block text-sm font-medium"
          >
            Estado
          </label>
          <select
            id="attendance-status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as AttendanceRow["status"] | "all")
            }
            className="mt-1 h-11 rounded-lg border border-border bg-surface px-3"
          >
            <option value="all">Todos</option>
            <option value="verified">Verificado</option>
            <option value="issued">Pendiente</option>
            <option value="sin-registrar">Sin registrar</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="attendance-grado"
            className="block text-sm font-medium"
          >
            Grado
          </label>
          <select
            id="attendance-grado"
            value={gradoFilter}
            onChange={(e) => setGradoFilter(e.target.value)}
            className="mt-1 h-11 rounded-lg border border-border bg-surface px-3"
          >
            <option value="all">Todos</option>
            {grados.map((grado) => (
              <option key={grado} value={grado}>
                {grado}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="p-3">Grado</th>
              <th className="p-3">Apellidos y nombres</th>
              <th className="p-3">CIP</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.personnelId} className="border-t border-border">
                <td className="p-3">{row.grado}</td>
                <td className="p-3">
                  {row.apellidos}, {row.nombres}
                </td>
                <td className="p-3 tabular-nums">{row.cip}</td>
                <td className="p-3">
                  <StatusBadge
                    variant={ROW_STATUS_VARIANT[row.status]}
                    label={ROW_STATUS_LABEL[row.status]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
