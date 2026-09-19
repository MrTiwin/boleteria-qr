import { describe, expect, it } from "vitest";
import {
  editPersonnelSchema,
  personnelCsvRowSchema,
  registroSchema,
  stationLoginSchema,
} from "@/lib/schemas";

describe("registroSchema", () => {
  it("accepts a plausible digits-only cip and dni", () => {
    const result = registroSchema.safeParse({
      cip: "123456789",
      dni: "87654321",
      consent: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a cip containing letters", () => {
    const result = registroSchema.safeParse({
      cip: "12AB56",
      dni: "87654321",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a dni that is too short", () => {
    const result = registroSchema.safeParse({
      cip: "123456789",
      dni: "12",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a cip that is absurdly long", () => {
    const result = registroSchema.safeParse({
      cip: "1".repeat(30),
      dni: "87654321",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("trims surrounding whitespace before validating", () => {
    const result = registroSchema.safeParse({
      cip: "  123456789  ",
      dni: " 87654321 ",
      consent: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("editPersonnelSchema", () => {
  it("rejects apellidos longer than 100 characters", () => {
    const result = editPersonnelSchema.safeParse({
      grado: "TTE",
      apellidos: "A".repeat(101),
      nombres: "Juan",
      cip: "123456789",
      dni: "87654321",
      pagado: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a name field at exactly the 100-character limit", () => {
    const result = editPersonnelSchema.safeParse({
      grado: "TTE",
      apellidos: "A".repeat(100),
      nombres: "Juan",
      cip: "123456789",
      dni: "87654321",
      pagado: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("dni normalization", () => {
  it("left-pads a 7-digit dni to 8 digits in registroSchema", () => {
    const result = registroSchema.safeParse({
      cip: "123456789",
      dni: "8169957",
      consent: true,
    });
    expect(result.success && result.data.dni).toBe("08169957");
  });

  it("leaves an 8-digit dni unchanged", () => {
    const result = registroSchema.safeParse({
      cip: "123456789",
      dni: "08169957",
      consent: true,
    });
    expect(result.success && result.data.dni).toBe("08169957");
  });

  it("pads the dni when parsing a CSV row and an admin edit too", () => {
    const csv = personnelCsvRowSchema.safeParse({
      grado: "CRL",
      apellidos: "Facundo Muñoz",
      nombres: "Liza Olinda",
      cip: "400135400",
      dni: "8169957",
      pagado: "SI",
    });
    expect(csv.success && csv.data.dni).toBe("08169957");

    const edit = editPersonnelSchema.safeParse({
      grado: "CRL",
      apellidos: "Facundo Muñoz",
      nombres: "Liza Olinda",
      cip: "400135400",
      dni: "8169957",
      pagado: true,
    });
    expect(edit.success && edit.data.dni).toBe("08169957");
  });
});

describe("stationLoginSchema", () => {
  it("uppercases the station code", () => {
    const result = stationLoginSchema.safeParse({ code: "  ab3kx9mn " });
    expect(result.success && result.data.code).toBe("AB3KX9MN");
  });
});
