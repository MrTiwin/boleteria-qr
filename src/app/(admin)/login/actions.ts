"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/schemas";
import {
  isAdminLoginRateLimited,
  recordFailedAdminLogin,
} from "@/server/admin-login-rate-limit";

export type AdminLoginActionState = {
  error: { code: string; message: string } | null;
};

export async function adminLoginAction(
  _prevState: AdminLoginActionState,
  formData: FormData,
): Promise<AdminLoginActionState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: {
        code: "INVALID_INPUT",
        message: "Completa correo y contraseña.",
      },
    };
  }

  const { email, password } = parsed.data;

  if (await isAdminLoginRateLimited(email)) {
    return {
      error: {
        code: "RATE_LIMITED",
        message: "Demasiados intentos. Intenta de nuevo más tarde.",
      },
    };
  }

  try {
    // nextCookies() (see src/lib/auth.ts) sets the session cookie automatically here.
    await auth.api.signInEmail({ body: { email, password } });
  } catch {
    await recordFailedAdminLogin(email);
    return {
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Correo o contraseña incorrectos.",
      },
    };
  }

  redirect("/admin");
}
