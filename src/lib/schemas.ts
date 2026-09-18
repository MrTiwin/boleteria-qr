import { z } from "zod";

// Shared zod schemas — edited across tasks as each flow lands. One schema per concern; do not
// reuse a schema across two unrelated forms even if the shape looks similar today.

export const personnelCsvHeader = [
  "grado",
  "apellidos",
  "nombres",
  "cip",
  "dni",
  "pagado",
] as const;

export const personnelCsvRowSchema = z.object({
  grado: z.string().trim().min(1, "grado is required"),
  apellidos: z.string().trim().min(1, "apellidos is required"),
  nombres: z.string().trim().min(1, "nombres is required"),
  cip: z.string().trim().min(1, "cip is required"),
  dni: z.string().trim().min(1, "dni is required"),
  pagado: z.enum(["SI", "NO"], { message: "pagado must be SI or NO" }),
});

export type PersonnelCsvRow = z.infer<typeof personnelCsvRowSchema>;
