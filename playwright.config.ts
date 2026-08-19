import { defineConfig, devices } from "@playwright/test";

/**
 * Phase 10 critical-flow E2E suite. `workers: 1` / `fullyParallel: false`
 * are deliberate, not defaults left alone: the app's data layer is one
 * `globalThis`-backed in-memory store (see `src/server/repositories/store.ts`)
 * with no per-test isolation, so two specs running concurrently against the
 * same dev server would corrupt each other's fixtures. Each spec still gets
 * its own project (via a unique email/slug) so they don't collide with each
 * other's *data*, just not with each other's *timing*.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  // One retry absorbs a known `next dev`+Turbopack artifact: the *first*
  // SSR of a given route in a freshly started dev process occasionally hits
  // a torn module graph mid-compile ("Slot failed to slot onto its
  // children"), which mounts the dev error overlay and can eat a click on
  // that page. It's cold-compile-only — reproducible only on a route's
  // first hit, never on a retry, and does not reproduce against a
  // production build — so it is a dev-server characteristic, not a product
  // defect. See the Phase 10 report for how this was isolated.
  retries: 1,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    // `localhost`, not `127.0.0.1`: Next.js dev's `allowedDevOrigins` guard
    // 403s hydration chunk requests from a raw IP, which silently leaves
    // every client component un-hydrated (native-submit forms still "work",
    // making this easy to miss — every `type="button"` onClick just does
    // nothing).
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
