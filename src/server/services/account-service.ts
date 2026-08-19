import "server-only";

import { logger } from "@/lib/logging/logger";
import { deleteActivityForProject, listActivityForProject } from "@/server/repositories/activity-repository";
import { deleteMcpDataForProject } from "@/server/repositories/mcp-repository";
import {
  deleteProjectCascade,
  listFeaturesForProject,
  listIssuesForProject,
  listProjectsForOwner,
  listTestCasesForProject,
  listTestResultsForProject,
  listTestRunsForProject,
} from "@/server/repositories/project-repository";
import { deleteTokensForUser } from "@/server/repositories/token-repository";
import { deleteUser } from "@/server/repositories/user-repository";
import { destroySession } from "@/lib/auth/session";
import type { PublicUser } from "@/types/auth";

/**
 * Minimal account-level data export and deletion (Phase 10 Build: "Privacy,
 * terms, and minimal account deletion/export flows"). Both operate on every
 * project the account owns — there is no shared/team ownership yet
 * (00-PRODUCT.md MVP boundaries exclude "Enterprise roles and permissions"),
 * so "the account's data" and "the account's owned projects" are the same set.
 */

export type AccountExport = {
  exportedAt: string;
  account: { name: string; email: string; memberSince: string };
  projects: Array<{
    project: unknown;
    features: unknown[];
    testCases: unknown[];
    testRuns: unknown[];
    testResults: unknown[];
    issues: unknown[];
    activity: unknown[];
  }>;
};

export async function exportAccountData(user: PublicUser): Promise<AccountExport> {
  const projects = await listProjectsForOwner(user.id);

  return {
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email, memberSince: user.createdAt },
    projects: await Promise.all(
      projects.map(async (project) => ({
        project,
        features: await listFeaturesForProject(project.id),
        testCases: await listTestCasesForProject(project.id),
        testRuns: await listTestRunsForProject(project.id),
        testResults: await listTestResultsForProject(project.id),
        issues: await listIssuesForProject(project.id),
        activity: await listActivityForProject(project.id),
      })),
    ),
  };
}

/**
 * Permanently deletes the account and every project it owns, cascading
 * through every record that references those projects. Irreversible —
 * unlike `toggleProjectArchivedForOwner`, there is no undo. The caller
 * (the account-deletion action) is responsible for requiring precise
 * confirmation before calling this (03-CLAUDE-RULES.md, "Destructive
 * actions require precise confirmation").
 */
export async function deleteAccount(user: PublicUser): Promise<void> {
  const projects = await listProjectsForOwner(user.id);

  for (const project of projects) {
    await deleteMcpDataForProject(project.id);
    await deleteActivityForProject(project.id);
    await deleteProjectCascade(project.id);
  }

  await deleteTokensForUser(user.id);
  await deleteUser(user.id);
  await destroySession();

  logger.info("account deleted", { userId: user.id, projectCount: projects.length });
}
