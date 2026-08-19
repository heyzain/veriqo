import "server-only";

import { logger } from "@/lib/logging/logger";
import { resetDemoData } from "@/server/repositories/seed";
import { destroySession } from "@/lib/auth/session";

/**
 * Demo/staging-only utilities (Phase 10 Build: "Seed/demo reset"). Every
 * function here refuses outright in production — this file exists so a demo
 * or staging environment can be put back to a known-good state, never to
 * touch a real deployment's data.
 */
export type DevActionResult = { ok: true } | { ok: false; error: string };

export async function resetDemoDataForDev(): Promise<DevActionResult> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Demo reset is disabled in production." };
  }

  await resetDemoData();
  await destroySession(); // the signed-in account no longer exists post-reset
  logger.info("demo data reset");
  return { ok: true };
}
