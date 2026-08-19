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
  listTestResultsForProject,
  listTestRunsForProject,
  updateProject,
} from "@/server/repositories/project-repository";
import { ensureSeeded } from "@/server/repositories/seed";
import type { Project, ProjectEnvironment } from "@/types/domain";
import type { PublicUser } from "@/types/auth";

export async function listProjects(owner: PublicUser): Promise<{
  active: Project[];
  archived: Project[];
}> {
  await ensureSeeded();
  const projects = (await listProjectsForOwner(owner.id)).sort(
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
export async function getProjectForOwner(slug: string, owner: PublicUser): Promise<Project | null> {
  await ensureSeeded();
  return findProjectForOwner(slug, owner.id);
}

export async function getLastActivityForProject(projectId: string) {
  return (await listActivityForProject(projectId))[0];
}

export type CreateProjectInput = {
  name: string;
  description: string;
  appUrl: string;
  environment: ProjectEnvironment;
  repository?: string;
};

export async function createProjectForOwner(input: CreateProjectInput, owner: PublicUser): Promise<Project> {
  await ensureSeeded();
  const { slugs, codes } = await allSlugsAndCodes();

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

  await createProject(project);
  await recordActivity({
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

export async function getProjectSummary(slug: string, owner: PublicUser): Promise<ProjectSummary | null> {
  await ensureSeeded();
  const project = await findProjectForOwner(slug, owner.id);
  if (!project) return null;

  const [features, testCases, testRuns, issues, activity] = await Promise.all([
    listFeaturesForProject(project.id),
    listTestCasesForProject(project.id),
    listTestRunsForProject(project.id),
    listIssuesForProject(project.id),
    listActivityForProject(project.id),
  ]);

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
  /** Every recorded result across every run — Phase 9's release-confidence and analytics engines need results at the project level, not one run at a time. */
  testResults: import("@/types/domain").TestResult[];
  issues: import("@/types/domain").Issue[];
  activity: import("@/types/domain").ActivityEvent[];
};

export async function getProjectRecords(slug: string, owner: PublicUser): Promise<ProjectRecords | null> {
  await ensureSeeded();
  const project = await findProjectForOwner(slug, owner.id);
  if (!project) return null;

  const [features, testCases, testRuns, testResults, issues, activity] = await Promise.all([
    listFeaturesForProject(project.id),
    listTestCasesForProject(project.id),
    listTestRunsForProject(project.id),
    listTestResultsForProject(project.id),
    listIssuesForProject(project.id),
    listActivityForProject(project.id),
  ]);

  return { project, features, testCases, testRuns, testResults, issues, activity };
}

export type UpdateProjectInput = {
  name: string;
  description: string;
  appUrl: string;
  environment: ProjectEnvironment;
  repository?: string;
};

export async function updateProjectForOwner(
  slug: string,
  input: UpdateProjectInput,
  owner: PublicUser,
): Promise<Project | null> {
  await ensureSeeded();
  const project = await findProjectForOwner(slug, owner.id);
  if (!project) return null;

  const updated: Project = {
    ...project,
    name: input.name.trim(),
    description: input.description.trim(),
    appUrl: input.appUrl.trim(),
    environment: input.environment,
    repository: input.repository?.trim() || undefined,
  };

  await updateProject(updated);

  await recordActivity({
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

/**
 * Bumps `setupStepsCompleted` up to `step`, never down and never past it in
 * one call — each guided-setup step (setup-steps.config.ts) is only ever
 * satisfied by the specific event that proves it, not by unrelated later
 * activity. Shared by every service that can complete a step (MCP connection,
 * feature discovery/review, …) so the "already satisfied" check lives in one
 * place. Returns the project unchanged when nothing moved, so callers can
 * compare by reference to decide whether to log a "step complete" event.
 */
export async function advanceSetupStep(project: Project, step: number): Promise<Project> {
  if (project.setupStepsCompleted >= step) return project;
  const updated: Project = { ...project, setupStepsCompleted: step };
  await updateProject(updated);
  return updated;
}

export async function toggleProjectArchivedForOwner(slug: string, owner: PublicUser): Promise<Project | null> {
  await ensureSeeded();
  const project = await findProjectForOwner(slug, owner.id);
  if (!project) return null;

  const updated: Project = {
    ...project,
    archived: !project.archived,
  };

  await updateProject(updated);

  await recordActivity({
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
