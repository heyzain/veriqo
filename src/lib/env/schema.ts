import { z } from "zod";

/**
 * Server-side environment. Extend this as later phases introduce a
 * database, auth secrets, storage, email, etc. Keep every required value
 * validated here rather than reading `process.env` ad hoc across the app.
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

/**
 * Client-side environment. Only `NEXT_PUBLIC_`-prefixed values may appear
 * here — anything else would silently be `undefined` in the browser bundle
 * anyway, but naming the boundary explicitly keeps that constraint visible.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
