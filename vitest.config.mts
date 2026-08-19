import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The real package throws unless bundled under React's `react-server`
      // condition, which Vitest doesn't set — see src/test/mocks/server-only.ts.
      "server-only": fileURLToPath(new URL("./src/test/mocks/server-only.ts", import.meta.url)),
      // `cookies()` throws outside a real Next.js request context — see
      // src/test/mocks/next-headers.ts.
      "next/headers": fileURLToPath(new URL("./src/test/mocks/next-headers.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // The `forks` pool (Vitest's default) fails to spawn worker processes in
    // this environment's sandboxed shell; `threads` is unaffected.
    pool: "threads",
    // Service tests share one real MongoDB test database (`veriqo_test`) —
    // unlike the old in-memory store, which got a fresh copy per worker
    // thread's own module state for free, every file's `beforeEach` now
    // drops every collection in that same physical database. Running files
    // in parallel let one file's reset wipe out another's fixtures mid-test.
    // Sequential file execution keeps the shared database correct.
    fileParallelism: false,
    // `e2e/**` holds Playwright specs (their own `test`/`expect`, driven by
    // `npx playwright test`) — excluded here so Vitest's default `*.spec.ts`
    // pickup doesn't try to run them under jsdom.
    exclude: [...configDefaults.exclude, "e2e/**"],
    // A separate database from dev/production — `src/test/db.ts` drops every
    // collection in it between tests, which would be catastrophic against
    // real data. Set here (not `.env.local`) so it's set before anything
    // parses `serverEnv` and can never be forgotten per-developer-machine.
    env: {
      MONGODB_URI: "mongodb://127.0.0.1:27017/veriqo_test",
    },
  },
});
