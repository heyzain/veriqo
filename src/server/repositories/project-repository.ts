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
