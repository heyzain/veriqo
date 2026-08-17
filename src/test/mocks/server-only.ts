// Test-only stand-in for the `server-only` package. The real package throws
// unconditionally unless bundled under React's `react-server` condition,
// which Vitest doesn't set — see vitest.config.mts, where this file is
// aliased in so `import "server-only"` is a no-op during tests instead of
// throwing.
export {};
