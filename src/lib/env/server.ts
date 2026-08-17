import "server-only";

import { serverEnvSchema } from "./schema";

/**
 * Validates the server environment once at import time and fails startup
 * with a readable error instead of surfacing `undefined` deep in a request
 * handler. Import from server components, route handlers, and server
 * actions only — the `server-only` import makes an accidental client
 * import a build error.
 */
function loadServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const serverEnv = loadServerEnv();
