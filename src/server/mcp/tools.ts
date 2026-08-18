import "server-only";

import { totalSetupSteps } from "@/config/setup-steps.config";
import {
  listFeaturesForProject,
  listIssuesForProject,
  listTestCasesForProject,
  listTestRunsForProject,
} from "@/server/repositories/project-repository";
import type { Project } from "@/types/domain";

/**
 * The two initial MCP tools required by Phase 3 — "project context and
 * health check" (02-BUILD-PHASES.md). Deliberately least-privilege and
 * read-only: this is the connection-proving surface, not the
 * create/update-feature/test-case tools that arrive with Phase 4+
 * (04-CONFIG-BLUEPRINT.md, "MCP rules — Least-privilege tools").
 *
 * Every response is project-scoped by construction — callers only ever have
 * a `Project` here after `mcp-service.ts` has already verified the
 * credential against it, so there is no separate authorization check to
 * duplicate in this file.
 */
export const mcpToolNames = ["health_check", "get_project_context"] as const;
export type McpToolName = (typeof mcpToolNames)[number];

export function isMcpToolName(value: unknown): value is McpToolName {
  return typeof value === "string" && (mcpToolNames as readonly string[]).includes(value);
}

export type McpToolOutput = Record<string, unknown>;

function healthCheck(project: Project): McpToolOutput {
  return {
    status: "ok",
    project: { publicId: project.publicId, name: project.name, slug: project.slug },
    serverTime: new Date().toISOString(),
  };
}

function getProjectContext(project: Project): McpToolOutput {
  return {
    project: {
      publicId: project.publicId,
      name: project.name,
      slug: project.slug,
      description: project.description,
      appUrl: project.appUrl,
      environment: project.environment,
      repository: project.repository ?? null,
    },
    setup: {
      stepsCompleted: project.setupStepsCompleted,
      totalSteps: totalSetupSteps,
    },
    counts: {
      features: listFeaturesForProject(project.id).length,
      testCases: listTestCasesForProject(project.id).length,
      testRuns: listTestRunsForProject(project.id).length,
      issues: listIssuesForProject(project.id).length,
    },
  };
}

export function runMcpTool(tool: McpToolName, project: Project): McpToolOutput {
  switch (tool) {
    case "health_check":
      return healthCheck(project);
    case "get_project_context":
      return getProjectContext(project);
  }
}
