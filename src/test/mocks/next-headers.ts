// Test-only stand-in for `next/headers`'s `cookies()`, which otherwise
// throws outside an actual Next.js request context. Aliased in via
// vitest.config.mts. Backed by a module-level jar so a test can call
// `createSession` and then `getSessionUserId` and see the same cookie, the
// way a real request/response cycle would.
type StoredCookie = { value: string };

const jar = new Map<string, StoredCookie>();

export function __resetCookieJarForTests() {
  jar.clear();
}

export async function cookies() {
  return {
    get(name: string) {
      const found = jar.get(name);
      return found ? { name, value: found.value } : undefined;
    },
    set(name: string, value: string) {
      jar.set(name, { value });
    },
    delete(name: string) {
      jar.delete(name);
    },
  };
}
