import "server-only";

import { store } from "@/server/repositories/store";
import type { Feature, Project, TestCase } from "@/types/domain";

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

export function listFeaturesForProject(projectId: string): Feature[] {
  return Array.from(store.features.values()).filter((f) => f.projectId === projectId);
}

/** Scoped by `projectId` so a public ID from another project can never resolve here. */
export function findFeatureByPublicId(projectId: string, publicId: string): Feature | null {
  return (
    Array.from(store.features.values()).find(
      (f) => f.projectId === projectId && f.publicId === publicId,
    ) ?? null
  );
}

export function findFeatureById(projectId: string, id: string): Feature | null {
  const feature = store.features.get(id);
  if (!feature || feature.projectId !== projectId) return null;
  return feature;
}

export function nextFeatureSequence(projectId: string): number {
  return listFeaturesForProject(projectId).length + 1;
}

export function saveFeature(feature: Feature): void {
  store.features.set(feature.id, feature);
}

/**
 * Re-points every test case and issue referencing `fromFeatureId` to
 * `toFeatureId` — used when merging a duplicate feature so its connected
 * records (00-PRODUCT.md domain relationships) survive the merge instead of
 * dangling against an archived feature.
 */
export function reassignFeatureReferences(fromFeatureId: string, toFeatureId: string): void {
  for (const testCase of store.testCases.values()) {
    if (testCase.featureId === fromFeatureId) {
      store.testCases.set(testCase.id, { ...testCase, featureId: toFeatureId });
    }
  }
  for (const issue of store.issues.values()) {
    if (issue.featureId === fromFeatureId) {
      store.issues.set(issue.id, { ...issue, featureId: toFeatureId });
    }
  }
}

export function listTestCasesForProject(projectId: string) {
  return Array.from(store.testCases.values()).filter((tc) => tc.projectId === projectId);
}

/** Scoped by `projectId` so a public ID from another project can never resolve here. */
export function findTestCaseByPublicId(projectId: string, publicId: string): TestCase | null {
  return (
    Array.from(store.testCases.values()).find(
      (tc) => tc.projectId === projectId && tc.publicId === publicId,
    ) ?? null
  );
}

export function findTestCaseById(projectId: string, id: string): TestCase | null {
  const testCase = store.testCases.get(id);
  if (!testCase || testCase.projectId !== projectId) return null;
  return testCase;
}

export function saveTestCase(testCase: TestCase): void {
  store.testCases.set(testCase.id, testCase);
}

/** Every public ID already used with `prefix` in this project — the set `nextTestCasePublicId` scans for a free sequence number. */
export function testCasePublicIdsWithPrefix(projectId: string, prefix: string): Set<string> {
  const ids = new Set<string>();
  for (const tc of store.testCases.values()) {
    if (tc.projectId === projectId && tc.publicId.startsWith(`${prefix}-`)) ids.add(tc.publicId);
  }
  return ids;
}

export function listTestRunsForProject(projectId: string) {
  return Array.from(store.testRuns.values()).filter((tr) => tr.projectId === projectId);
}

export function listIssuesForProject(projectId: string) {
  return Array.from(store.issues.values()).filter((iss) => iss.projectId === projectId);
}

