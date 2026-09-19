import { z } from "zod";

// Shared zod schemas — edited across tasks as each flow lands. One schema per concern; do not
// reuse a schema across two unrelated forms even if the shape looks similar today.

// CIP and DNI are digits-only identifiers, but their length varies in the real roster (DNI is
// usually 8 digits but a leading zero sometimes gets dropped upstream; CIP is usually 9). 4-15
// is generous enough to never reject real data while still blocking "not a number at all" and
// absurdly long pasted strings.
const digitsField = (label: string) =>
  z
    .string()
    .trim()
    .min(4, `${label} debe tener al menos 4 dígitos`)
    .max(15, `${label} es demasiado largo`)
    .regex(/^\d+$/, `${label} solo debe contener números`);

// A Peruvian DNI is always 8 digits. Spreadsheet exports store it as a number and silently drop
// the leading zero (08169957 -> 8169957), so every DNI that enters the system — CSV import,
// registration, ticket lookup, admin edit — is left-padded to 8 here. Without this, a person
// typing their real 8-digit DNI never matches the 7-digit value stored for them.
const dniField = (label: string) =>
  digitsField(label).transform((value) => value.padStart(8, "0"));

// Generous caps on free-text name fields — long enough for any real grado/apellidos/nombres,
// short enough to block pasted-in garbage.
const shortTextField = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(max, `${label} no puede tener más de ${max} caracteres`);

export const personnelCsvHeader = [
  "grado",
  "apellidos",
  "nombres",
  "cip",
  "dni",
  "pagado",
] as const;

export const personnelCsvRowSchema = z.object({
  grado: shortTextField("grado", 30),
  apellidos: shortTextField("apellidos", 100),
  nombres: shortTextField("nombres", 100),
  cip: digitsField("cip"),
  dni: dniField("dni"),
  pagado: z.enum(["SI", "NO"], { message: "pagado must be SI or NO" }),
});

export type PersonnelCsvRow = z.infer<typeof personnelCsvRowSchema>;

export const registroSchema = z.object({
  cip: digitsField("CIP"),
  dni: dniField("DNI"),
  consent: z.boolean(),
});

export type RegistroInput = z.infer<typeof registroSchema>;

export const editPersonnelSchema = z.object({
  grado: shortTextField("grado", 30),
  apellidos: shortTextField("apellidos", 100),
  nombres: shortTextField("nombres", 100),
  cip: digitsField("CIP"),
  dni: dniField("DNI"),
  pagado: z.boolean(),
});

export type EditPersonnelInput = z.infer<typeof editPersonnelSchema>;

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, "correo demasiado largo")
    .email("must be a valid email"),
  password: z
    .string()
    .min(1, "password is required")
    .max(200, "password demasiado larga"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const createHostUserSchema = z.object({
  name: shortTextField("nombre", 100),
  email: z
    .string()
    .trim()
    .max(254, "correo demasiado largo")
    .email("must be a valid email"),
});

export type CreateHostUserInput = z.infer<typeof createHostUserSchema>;

export const createStationSchema = z.object({
  label: shortTextField("nombre de la estación", 60),
});

export type CreateStationInput = z.infer<typeof createStationSchema>;

// Station codes are 8 characters today (see src/server/stations.ts's CODE_ALPHABET), but this
// stays loose on exact length/charset — it only exists to reject empty submissions and absurdly
// long pasted strings before they reach the rate limiter. verifyStationCode's hash comparison is
// the real gate.
export const stationLoginSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Ingresa el código de la estación.")
    .max(30, "Código demasiado largo.")
    // Codes are generated uppercase-only (CODE_ALPHABET), so a lowercase paste/autofill must still
    // match — the input uppercases while typing, this covers everything that bypasses it.
    .transform((value) => value.toUpperCase()),
});

export type StationLoginInput = z.infer<typeof stationLoginSchema>;
