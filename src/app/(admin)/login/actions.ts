"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type AdminLoginActionState = {
  error: { code: string; message: string } | null;
};

export async function adminLoginAction(
  _prevState: AdminLoginActionState,
  formData: FormData,
): Promise<AdminLoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: {
        code: "INVALID_INPUT",
        message: "Completa correo y contraseña.",
      },
    };
  }

  try {
    // nextCookies() (see src/lib/auth.ts) sets the session cookie automatically here.
    await auth.api.signInEmail({ body: { email, password } });
  } catch {
    return {
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Correo o contraseña incorrectos.",
      },
    };
  }

  redirect("/admin");
}
