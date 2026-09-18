import { describe, expect, it } from "vitest";
import { editPersonnelSchema, registroSchema } from "@/lib/schemas";

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
