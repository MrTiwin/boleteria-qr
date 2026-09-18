import { z } from "zod";

// The only place process.env is read for the app. Every other module imports `env` from here
// instead of touching process.env directly — see CLAUDE.md, "Where things live".
class MissingEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingEnvError";
  }
}

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is not set"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(1, "BETTER_AUTH_SECRET is not set")
    .optional(),
  BETTER_AUTH_URL: z.string().min(1, "BETTER_AUTH_URL is not set").optional(),
  QR_HMAC_SECRET: z.string().min(1, "QR_HMAC_SECRET is not set").optional(),
  ADMIN_SEED_EMAIL: z.string().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),
});

function loadEnv() {
  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    QR_HMAC_SECRET: process.env.QR_HMAC_SECRET,
    ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new MissingEnvError(
      `Missing or invalid environment variables: ${missing}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();
export { MissingEnvError };
