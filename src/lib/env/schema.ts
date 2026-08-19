import { z } from "zod";

/**
 * Development-only fallback for `AUTH_SECRET`, exported (not inlined) so
 * `src/proxy.ts` — which runs on the Edge runtime and can't import the
 * `server-only`-guarded `lib/env/server.ts` — can read `process.env`
 * directly while still matching the same fallback value used here.
 */
export const AUTH_SECRET_DEV_FALLBACK = "dev-only-insecure-secret-do-not-use-in-production!!";

/**
 * Development-only fallback for `MONGODB_URI`, mirroring `AUTH_SECRET_DEV_FALLBACK`
 * above — a local `mongod` on its default port, so `npm run dev` works without
 * an explicit `.env.local` entry. The `.refine` below is what actually enforces
 * the production requirement.
 */
export const MONGODB_URI_DEV_FALLBACK = "mongodb://127.0.0.1:27017/veriqo";

/**
 * Server-side environment. Extend this as later phases introduce a
 * database, storage, email, etc. Keep every required value validated here
 * rather than reading `process.env` ad hoc across the app.
 *
 * `AUTH_SECRET` signs session cookies (`lib/auth/session.ts`) and must be a
 * real secret in production. The dev fallback keeps `npm run dev`/`build`
 * working without local setup — the `.refine` below is what actually
 * enforces the production requirement, not the default.
 */
export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters")
      .default(AUTH_SECRET_DEV_FALLBACK),
    /**
     * Optional error-monitoring provider DSN (Sentry or similar). Unset in
     * every environment today — `lib/logging/logger.ts` always writes
     * structured JSON to stdout/stderr regardless, which is what an
     * external monitor actually ingests in most deployment setups. Kept
     * here, typed, as the one place a provider SDK would read its DSN from
     * once Phase 10's "error monitoring" moves from stdout logs to a real
     * provider.
     */
    MONITORING_DSN: z.string().optional(),
    /**
     * Mongoose connection string (`server/db/connection.ts`) — the one place
     * every repository ultimately reads/writes through. The dev fallback
     * keeps `npm run dev`/`build` working against a local `mongod` without
     * local setup — the `.refine` below is what actually enforces the
     * production requirement, not the default.
     */
    MONGODB_URI: z.string().min(1, "MONGODB_URI must not be empty").default(MONGODB_URI_DEV_FALLBACK),
  })
  .refine((env) => env.NODE_ENV !== "production" || env.AUTH_SECRET !== AUTH_SECRET_DEV_FALLBACK, {
    message: "AUTH_SECRET must be set to a real secret in production",
    path: ["AUTH_SECRET"],
  })
  .refine((env) => env.NODE_ENV !== "production" || env.MONGODB_URI !== MONGODB_URI_DEV_FALLBACK, {
    message: "MONGODB_URI must be set to a real connection string in production",
    path: ["MONGODB_URI"],
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
