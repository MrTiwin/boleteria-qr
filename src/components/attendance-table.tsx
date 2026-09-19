"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  StatusBadge,
  type StatusBadgeVariant,
} from "@/components/status-badge";
import { sortGrados } from "@/lib/grados";

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

type Stats = {
  total: number;
  registered: number;
  verified: number;
  unregistered: number;
  debtors: number;
};

type StatsResponse =
  | { ok: true; data: Stats }
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

  const stats = data?.ok ? data.data : null;

  // Four counters instead of one: the admin needs the whole funnel at a glance — who has
  // registered, who is actually through the door, who hasn't registered yet, and who still owes
  // payment — not only the door count.
  const cards = [
    {
      label: "Verificados",
      value: stats ? `${stats.verified} / ${stats.total}` : "…",
      tone: "text-success",
    },
    {
      label: "Registrados",
      value: stats ? stats.registered : "…",
      tone: "text-primary",
    },
    {
      label: "Sin registrar",
      value: stats ? stats.unregistered : "…",
      tone: "text-secondary",
    },
    {
      label: "Deudores",
      value: stats ? stats.debtors : "…",
      tone: "text-danger",
    },
  ];

  return (
    <div
      role="status"
      aria-live="polite"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <p className="text-sm text-muted-foreground">{card.label}</p>
          <p className={`text-3xl font-semibold tabular-nums ${card.tone}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

const ROW_STATUS_VARIANT: Record<AttendanceRow["status"], StatusBadgeVariant> =
  {
    verified: "verified",
    issued: "pending",
    "sin-registrar": "unregistered",
  };

const ROW_STATUS_LABEL: Record<AttendanceRow["status"], string> = {
  verified: "Verificado",
  issued: "Registrado",
  "sin-registrar": "Sin registrar",
};

export function AttendanceTable({
  rows,
  isAdmin = false,
  onResetTicket,
}: {
  rows: AttendanceRow[];
  isAdmin?: boolean;
  onResetTicket?: (formData: FormData) => void | Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<
    AttendanceRow["status"] | "all"
  >("all");
  const [gradoFilter, setGradoFilter] = useState<string>("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">(
    "all",
  );
  const [query, setQuery] = useState("");

  const grados = sortGrados(rows.map((row) => row.grado));

  const filtered = rows.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (gradoFilter !== "all" && row.grado !== gradoFilter) return false;
    if (paidFilter === "paid" && !row.pagado) return false;
    if (paidFilter === "unpaid" && row.pagado) return false;
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
            <option value="issued">Registrado</option>
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

        <div>
          <label
            htmlFor="attendance-paid"
            className="block text-sm font-medium"
          >
            Pago
          </label>
          <select
            id="attendance-paid"
            value={paidFilter}
            onChange={(e) =>
              setPaidFilter(e.target.value as "all" | "paid" | "unpaid")
            }
            className="mt-1 h-11 rounded-lg border border-border bg-surface px-3"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagado</option>
            <option value="unpaid">Debe</option>
          </select>
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mb-2 text-sm text-muted-foreground"
      >
        Mostrando <strong className="tabular-nums">{filtered.length}</strong> de{" "}
        <span className="tabular-nums">{rows.length}</span>
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="p-3">N°</th>
              <th className="p-3">Grado</th>
              <th className="p-3">Apellidos y nombres</th>
              <th className="p-3">CIP</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Pagado</th>
              {isAdmin && <th className="p-3" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr
                key={row.personnelId}
                className="border-t border-border transition-colors duration-150 hover:bg-background/60"
              >
                <td className="p-3 tabular-nums text-muted-foreground">
                  {index + 1}
                </td>
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
                <td className="p-3">
                  <StatusBadge variant={row.pagado ? "paid" : "unpaid"} />
                </td>
                {isAdmin && (
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/personal/${row.personnelId}`}
                        className="text-sm text-primary underline"
                      >
                        Editar
                      </Link>
                      {row.status !== "sin-registrar" && onResetTicket && (
                        <form action={onResetTicket}>
                          <input
                            type="hidden"
                            name="personnelId"
                            value={row.personnelId}
                          />
                          <button
                            type="submit"
                            title="Borra el ticket para volver a probar el registro"
                            className="text-sm text-muted-foreground underline decoration-dotted transition-colors duration-150 hover:text-danger"
                          >
                            Reiniciar
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
