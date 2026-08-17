import { clientEnvSchema } from "./schema";

/**
 * Validates the subset of environment variables that are safe to ship to
 * the browser. Only read `NEXT_PUBLIC_*` values here — anything else must
 * go through `server.ts` and stay on the server.
 */
function loadClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid client environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const clientEnv = loadClientEnv();
