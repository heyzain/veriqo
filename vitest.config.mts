import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

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
  },
});
