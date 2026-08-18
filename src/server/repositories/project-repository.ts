import "server-only";

import { store } from "@/server/repositories/store";
import type { Project } from "@/types/domain";

/**
 * Every read is scoped by `ownerId` at this layer — not just filtered in the
 * UI — so a missing scope check can never leak another user's project
 * (03-CLAUDE-RULES.md, "Project-scoped actions must verify project
 * ownership server-side").
 */
export function listProjectsForOwner(ownerId: string): Project[] {
  return Array.from(store.projects.values()).filter((project) => project.ownerId === ownerId);
}

export function findProjectForOwner(slug: string, ownerId: string): Project | null {
  const project = Array.from(store.projects.values()).find((p) => p.slug === slug);
  if (!project || project.ownerId !== ownerId) return null;
  return project;
}

export function findProjectByIdForOwner(id: string, ownerId: string): Project | null {
  const project = store.projects.get(id);
  if (!project || project.ownerId !== ownerId) return null;
  return project;
}

/**
 * Unscoped slug lookup for the Claude MCP route handler
 * (`app/api/mcp/[slug]/route.ts`), which authenticates a request by its
 * project-scoped credential rather than a signed-in owner session — there is
 * no `PublicUser` to check ownership against. The credential itself is the
 * authorization boundary; see `server/services/mcp-service.ts`.
 */
export function findProjectBySlug(slug: string): Project | null {
  return Array.from(store.projects.values()).find((p) => p.slug === slug) ?? null;
}

export function allSlugsAndCodes(): { slugs: Set<string>; codes: Set<string> } {
  const slugs = new Set<string>();
  const codes = new Set<string>();
  for (const project of store.projects.values()) {
    slugs.add(project.slug);
    codes.add(project.publicId);
  }
  return { slugs, codes };
}

export function createProject(project: Project): void {
  store.projects.set(project.id, project);
}

export function updateProject(project: Project): void {
  store.projects.set(project.id, project);
}

export function listFeaturesForProject(projectId: string) {
  return Array.from(store.features.values()).filter((f) => f.projectId === projectId);
}

export function listTestCasesForProject(projectId: string) {
  return Array.from(store.testCases.values()).filter((tc) => tc.projectId === projectId);
}

export function listTestRunsForProject(projectId: string) {
  return Array.from(store.testRuns.values()).filter((tr) => tr.projectId === projectId);
}

export function listIssuesForProject(projectId: string) {
  return Array.from(store.issues.values()).filter((iss) => iss.projectId === projectId);
}

