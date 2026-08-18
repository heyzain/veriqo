import "server-only";

import {
  mcpCreateFeatureSchema,
  mcpListFeaturesSchema,
  mcpUpdateFeatureSchema,
} from "@/features/features/schemas";
import { totalSetupSteps } from "@/config/setup-steps.config";
import {
  createFeatureFromDiscovery,
  listFeaturesForMcp,
  updateFeatureFromDiscovery,
} from "@/server/services/feature-service";
import {
  listFeaturesForProject,
  listIssuesForProject,
  listTestCasesForProject,
  listTestRunsForProject,
} from "@/server/repositories/project-repository";
import type { Feature, Project } from "@/types/domain";

/**
 * MCP tools available to a connected Claude client, project-scoped by
 * construction — every function here only ever receives a `Project` that
 * `mcp-service.ts` has already authenticated a request's credential against.
 * `health_check`/`get_project_context` are the read-only Phase 3 tools;
 * `list_features`/`create_feature`/`update_feature` are Phase 4's
 * least-privilege additions (04-CONFIG-BLUEPRINT.md, "MCP rules").
 */
export const mcpToolNames = [
  "health_check",
  "get_project_context",
  "list_features",
  "create_feature",
  "update_feature",
] as const;
export type McpToolName = (typeof mcpToolNames)[number];

export function isMcpToolName(value: unknown): value is McpToolName {
  return typeof value === "string" && (mcpToolNames as readonly string[]).includes(value);
}

export type McpToolOutput = Record<string, unknown>;
export type McpToolRunResult = { ok: true; result: McpToolOutput } | { ok: false; error: string };

function toolOk(result: McpToolOutput): McpToolRunResult {
  return { ok: true, result };
}
function toolFail(error: string): McpToolRunResult {
  return { ok: false, error };
}

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

/** `Do not expose database IDs when stable public IDs are appropriate` (04-CONFIG-BLUEPRINT.md). */
function toMcpFeature(feature: Feature, allFeatures: readonly Feature[]): Record<string, unknown> {
  const duplicateOf = feature.possibleDuplicateOfId
    ? allFeatures.find((f) => f.id === feature.possibleDuplicateOfId)
    : undefined;

  return {
    featureId: feature.publicId,
    name: feature.name,
    description: feature.description,
    status: feature.status,
    risk: feature.risk,
    acceptanceCriteria: feature.acceptanceCriteria,
    roles: feature.roles,
    dependencies: feature.dependencies,
    sourceReferences: feature.sourceReferences,
    possibleDuplicateOf: duplicateOf?.publicId ?? null,
  };
}

function listFeatures(project: Project, input: unknown): McpToolRunResult {
  const parsed = mcpListFeaturesSchema.safeParse(input ?? {});
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const allFeatures = listFeaturesForProject(project.id);
  const features = listFeaturesForMcp(project, parsed.data.status);
  return toolOk({ features: features.map((f) => toMcpFeature(f, allFeatures)) });
}

function createFeature(project: Project, input: unknown): McpToolRunResult {
  const parsed = mcpCreateFeatureSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const result = createFeatureFromDiscovery(project, parsed.data);
  if (!result.ok) return toolFail(result.error);

  const allFeatures = listFeaturesForProject(project.id);
  return toolOk({ feature: toMcpFeature(result.data.feature, allFeatures) });
}

function updateFeature(project: Project, input: unknown): McpToolRunResult {
  const parsed = mcpUpdateFeatureSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const { featureId, ...fields } = parsed.data;
  const result = updateFeatureFromDiscovery(project, featureId, fields);
  if (!result.ok) return toolFail(result.error);

  const allFeatures = listFeaturesForProject(project.id);
  return toolOk({ feature: toMcpFeature(result.data.feature, allFeatures) });
}

export function runMcpTool(tool: McpToolName, project: Project, input: unknown): McpToolRunResult {
  switch (tool) {
    case "health_check":
      return toolOk(healthCheck(project));
    case "get_project_context":
      return toolOk(getProjectContext(project));
    case "list_features":
      return listFeatures(project, input);
    case "create_feature":
      return createFeature(project, input);
    case "update_feature":
      return updateFeature(project, input);
  }
}
