import "server-only";

import type { ActivityEvent, Project } from "@/types/domain";
import type { AuthToken, Invite, User } from "@/types/auth";

/**
 * In-memory backing store for every Phase 1 repository, kept on
 * `globalThis` so it survives Next.js dev-server hot reloads instead of
 * resetting on every edit (the same pattern commonly used for a
 * dev-mode Prisma client singleton). This is the seam a real database
 * replaces later — every repository in this directory only talks to this
 * file, never to `globalThis` directly.
 */
type Store = {
  users: Map<string, User>;
  usersByEmail: Map<string, string>;
  tokens: Map<string, AuthToken>;
  invites: Map<string, Invite>;
  projects: Map<string, Project>;
  features: Map<string, import("@/types/domain").Feature>;
  testCases: Map<string, import("@/types/domain").TestCase>;
  testRuns: Map<string, import("@/types/domain").TestRun>;
  testResults: Map<string, import("@/types/domain").TestResult>;
  issues: Map<string, import("@/types/domain").Issue>;
  activity: ActivityEvent[];
  seeded: boolean;
};

function createStore(): Store {
  return {
    users: new Map(),
    usersByEmail: new Map(),
    tokens: new Map(),
    invites: new Map(),
    projects: new Map(),
    features: new Map(),
    testCases: new Map(),
    testRuns: new Map(),
    testResults: new Map(),
    issues: new Map(),
    activity: [],
    seeded: false,
  };
}

const globalForStore = globalThis as unknown as { __veriqoStore?: Store };

export const store: Store = globalForStore.__veriqoStore ?? createStore();

if (process.env.NODE_ENV !== "production") {
  globalForStore.__veriqoStore = store;
}
