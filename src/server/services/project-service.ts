import "server-only";

import { randomUUID } from "node:crypto";

import { uniqueProjectCode, uniqueProjectSlug } from "@/lib/ids/project-identifiers";
import { listActivityForProject, recordActivity } from "@/server/repositories/activity-repository";
import {
  allSlugsAndCodes,
  createProject,
  findProjectForOwner,
  listFeaturesForProject,
  listIssuesForProject,
  listProjectsForOwner,
  listTestCasesForProject,
  listTestRunsForProject,
  updateProject,
} from "@/server/repositories/project-repository";
import { ensureSeeded } from "@/server/repositories/seed";
import type { Project, ProjectEnvironment } from "@/types/domain";
import type { PublicUser } from "@/types/auth";

export function listProjects(owner: PublicUser): {
  active: Project[];
  archived: Project[];
} {
  ensureSeeded();
  const projects = listProjectsForOwner(owner.id).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return {
    active: projects.filter((p) => !p.archived),
    archived: projects.filter((p) => p.archived),
  };
}

/**
 * Server-side ownership check for the project detail route
 * (03-CLAUDE-RULES.md, "Project-scoped actions must verify project
 * ownership server-side") — returns `null` for both "doesn't exist" and
 * "exists but belongs to someone else" so the caller can't distinguish the
 * two and leak which slugs are taken.
 */
export function getProjectForOwner(slug: string, owner: PublicUser): Project | null {
  ensureSeeded();
  return findProjectForOwner(slug, owner.id);
}

export function getLastActivityForProject(projectId: string) {
  return listActivityForProject(projectId)[0];
}

export type CreateProjectInput = {
  name: string;
  description: string;
  appUrl: string;
  environment: ProjectEnvironment;
  repository?: string;
};

export function createProjectForOwner(input: CreateProjectInput, owner: PublicUser): Project {
  ensureSeeded();
  const { slugs, codes } = allSlugsAndCodes();

  const project: Project = {
    id: randomUUID(),
    publicId: uniqueProjectCode(input.name, codes),
    slug: uniqueProjectSlug(input.name, slugs),
    ownerId: owner.id,
    name: input.name.trim(),
    description: input.description.trim(),
    appUrl: input.appUrl.trim(),
    environment: input.environment,
    repository: input.repository?.trim() || undefined,
    archived: false,
    setupStepsCompleted: 1, // "Project created" is satisfied immediately.
    createdAt: new Date().toISOString(),
  };

  createProject(project);
  recordActivity({
    id: randomUUID(),
    projectId: project.id,
    actorType: "human",
    actorName: owner.name,
    action: "created the project",
    entityType: "project",
    entityId: project.id,
    createdAt: project.createdAt,
  });

  return project;
}

export type ProjectSummary = {
  project: Project;
  featuresCount: number;
  approvedFeaturesCount: number;
  testCasesCount: number;
  testRunsCount: number;
  issuesCount: number;
  verifiedIssuesCount: number;
  activityCount: number;
  lastActivity: import("@/types/domain").ActivityEvent | undefined;
};

export function getProjectSummary(slug: string, owner: PublicUser): ProjectSummary | null {
  ensureSeeded();
  const project = findProjectForOwner(slug, owner.id);
  if (!project) return null;

  const features = listFeaturesForProject(project.id);
  const testCases = listTestCasesForProject(project.id);
  const testRuns = listTestRunsForProject(project.id);
  const issues = listIssuesForProject(project.id);
  const activity = listActivityForProject(project.id);

  return {
    project,
    featuresCount: features.length,
    approvedFeaturesCount: features.filter((f) => f.status === "approved").length,
    testCasesCount: testCases.length,
    testRunsCount: testRuns.length,
    issuesCount: issues.length,
    verifiedIssuesCount: issues.filter((i) => i.status === "verified").length,
    activityCount: activity.length,
    lastActivity: activity[0],
  };
}

export type ProjectRecords = {
  project: Project;
  features: import("@/types/domain").Feature[];
  testCases: import("@/types/domain").TestCase[];
  testRuns: import("@/types/domain").TestRun[];
  issues: import("@/types/domain").Issue[];
  activity: import("@/types/domain").ActivityEvent[];
};

export function getProjectRecords(slug: string, owner: PublicUser): ProjectRecords | null {
  ensureSeeded();
  const project = findProjectForOwner(slug, owner.id);
  if (!project) return null;

  return {
    project,
    features: listFeaturesForProject(project.id),
    testCases: listTestCasesForProject(project.id),
    testRuns: listTestRunsForProject(project.id),
    issues: listIssuesForProject(project.id),
    activity: listActivityForProject(project.id),
  };
}

export type UpdateProjectInput = {
  name: string;
  description: string;
  appUrl: string;
  environment: ProjectEnvironment;
  repository?: string;
};

export function updateProjectForOwner(
  slug: string,
  input: UpdateProjectInput,
  owner: PublicUser,
): Project | null {
  ensureSeeded();
  const project = findProjectForOwner(slug, owner.id);
  if (!project) return null;

  const updated: Project = {
    ...project,
    name: input.name.trim(),
    description: input.description.trim(),
    appUrl: input.appUrl.trim(),
    environment: input.environment,
    repository: input.repository?.trim() || undefined,
  };

  updateProject(updated);

  recordActivity({
    id: randomUUID(),
    projectId: project.id,
    actorType: "human",
    actorName: owner.name,
    action: "updated project settings",
    entityType: "project",
    entityId: project.id,
    createdAt: new Date().toISOString(),
  });

  return updated;
}

export function toggleProjectArchivedForOwner(slug: string, owner: PublicUser): Project | null {
  ensureSeeded();
  const project = findProjectForOwner(slug, owner.id);
  if (!project) return null;

  const updated: Project = {
    ...project,
    archived: !project.archived,
  };

  updateProject(updated);

  recordActivity({
    id: randomUUID(),
    projectId: project.id,
    actorType: "human",
    actorName: owner.name,
    action: updated.archived ? "archived the project" : "unarchived the project",
    entityType: "project",
    entityId: project.id,
    createdAt: new Date().toISOString(),
  });

  return updated;
}

