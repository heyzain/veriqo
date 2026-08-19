import "server-only";

import {
  mcpCreateFeatureSchema,
  mcpListFeaturesSchema,
  mcpUpdateFeatureSchema,
} from "@/features/features/schemas";
import {
  mcpListIssuesSchema,
  mcpRecordIssueFixSchema,
  mcpUpdateIssueStatusSchema,
} from "@/features/issues/schemas";
import {
  mcpCreateTestCaseSchema,
  mcpListTestCasesSchema,
  mcpUpdateTestCaseSchema,
} from "@/features/test-cases/schemas";
import {
  mcpCompleteTestRunSchema,
  mcpStartTestRunSchema,
  mcpSubmitTestResultSchema,
} from "@/features/test-runs/schemas";
import { totalSetupSteps } from "@/config/setup-steps.config";
import {
  createFeatureFromDiscovery,
  listFeaturesForMcp,
  updateFeatureFromDiscovery,
} from "@/server/services/feature-service";
import { applyRerunResultToIssuesForCase, recordIssueFix, updateIssueStatus } from "@/server/services/issue-service";
import {
  createTestCaseFromGeneration,
  listTestCasesForMcp,
  updateTestCaseFromGeneration,
} from "@/server/services/test-case-service";
import {
  completeTestRunFromClaude,
  computeRunProgress,
  startTestRun,
  submitTestResult,
} from "@/server/services/test-run-service";
import {
  findFeatureById,
  findTestCaseById,
  listFeaturesForProject,
  listIssuesForProject,
  listTestCasesForProject,
  listTestResultsForRun,
  listTestRunsForProject,
} from "@/server/repositories/project-repository";
import type { Feature, Issue, Project, TestCase } from "@/types/domain";

/**
 * MCP tools available to a connected Claude client, project-scoped by
 * construction — every function here only ever receives a `Project` that
 * `mcp-service.ts` has already authenticated a request's credential against.
 * `health_check`/`get_project_context` are the read-only Phase 3 tools;
 * `list_features`/`create_feature`/`update_feature` are Phase 4's
 * least-privilege additions; `list_issues`/`update_issue_status`/
 * `record_issue_fix` are Phase 7's — deliberately narrow, since only a
 * human/system action ever marks an issue ready for retest, creates its
 * rerun, or verifies/reopens it; `start_test_run`/`submit_test_result`/
 * `complete_test_run` are Phase 8's — Claude drives a `claudeAssisted` run's
 * execution, but a result it flags `needsHumanReview` stays that way until a
 * human approves, corrects, or rejects it (04-CONFIG-BLUEPRINT.md, "MCP
 * rules").
 */
export const mcpToolNames = [
  "health_check",
  "get_project_context",
  "list_features",
  "create_feature",
  "update_feature",
  "list_test_cases",
  "create_test_case",
  "update_test_case",
  "list_issues",
  "update_issue_status",
  "record_issue_fix",
  "start_test_run",
  "submit_test_result",
  "complete_test_run",
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

async function getProjectContext(project: Project): Promise<McpToolOutput> {
  const [features, testCases, testRuns, issues] = await Promise.all([
    listFeaturesForProject(project.id),
    listTestCasesForProject(project.id),
    listTestRunsForProject(project.id),
    listIssuesForProject(project.id),
  ]);

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
      features: features.length,
      testCases: testCases.length,
      testRuns: testRuns.length,
      issues: issues.length,
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

async function listFeatures(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpListFeaturesSchema.safeParse(input ?? {});
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const allFeatures = await listFeaturesForProject(project.id);
  const features = await listFeaturesForMcp(project, parsed.data.status);
  return toolOk({ features: features.map((f) => toMcpFeature(f, allFeatures)) });
}

async function createFeature(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpCreateFeatureSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const result = await createFeatureFromDiscovery(project, parsed.data);
  if (!result.ok) return toolFail(result.error);

  const allFeatures = await listFeaturesForProject(project.id);
  return toolOk({ feature: toMcpFeature(result.data.feature, allFeatures) });
}

async function updateFeature(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpUpdateFeatureSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const { featureId, ...fields } = parsed.data;
  const result = await updateFeatureFromDiscovery(project, featureId, fields);
  if (!result.ok) return toolFail(result.error);

  const allFeatures = await listFeaturesForProject(project.id);
  return toolOk({ feature: toMcpFeature(result.data.feature, allFeatures) });
}

/** `Do not expose database IDs when stable public IDs are appropriate` (04-CONFIG-BLUEPRINT.md). */
async function toMcpTestCase(testCase: TestCase, allFeatures: readonly Feature[]): Promise<Record<string, unknown>> {
  const feature = allFeatures.find((f) => f.id === testCase.featureId);
  const projectTestCases = testCase.possibleDuplicateOfId
    ? await listTestCasesForProject(testCase.projectId)
    : [];
  const duplicateOf = testCase.possibleDuplicateOfId
    ? projectTestCases.find((tc) => tc.id === testCase.possibleDuplicateOfId)
    : undefined;

  return {
    testCaseId: testCase.publicId,
    featureId: feature?.publicId ?? null,
    title: testCase.title,
    status: testCase.status,
    priority: testCase.priority,
    preconditions: testCase.preconditions ?? null,
    steps: testCase.steps,
    expectedResult: testCase.expectedResult,
    roles: testCase.roles,
    environments: testCase.environments,
    possibleDuplicateOf: duplicateOf?.publicId ?? null,
  };
}

async function listTestCases(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpListTestCasesSchema.safeParse(input ?? {});
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const allFeatures = await listFeaturesForProject(project.id);
  const testCases = await listTestCasesForMcp(project, parsed.data.status, parsed.data.featureId);
  return toolOk({ testCases: await Promise.all(testCases.map((tc) => toMcpTestCase(tc, allFeatures))) });
}

async function createTestCase(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpCreateTestCaseSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const result = await createTestCaseFromGeneration(project, parsed.data);
  if (!result.ok) return toolFail(result.error);

  const allFeatures = await listFeaturesForProject(project.id);
  return toolOk({ testCase: await toMcpTestCase(result.data.testCase, allFeatures) });
}

async function updateTestCase(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpUpdateTestCaseSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const { testCaseId, ...fields } = parsed.data;
  const result = await updateTestCaseFromGeneration(project, testCaseId, fields);
  if (!result.ok) return toolFail(result.error);

  const allFeatures = await listFeaturesForProject(project.id);
  return toolOk({ testCase: await toMcpTestCase(result.data.testCase, allFeatures) });
}

/** `Do not expose database IDs when stable public IDs are appropriate` (04-CONFIG-BLUEPRINT.md). */
async function toMcpIssue(issue: Issue, project: Project): Promise<Record<string, unknown>> {
  const [feature, testCase] = await Promise.all([
    findFeatureById(project.id, issue.featureId),
    findTestCaseById(project.id, issue.testCaseId),
  ]);

  return {
    issueId: issue.publicId,
    title: issue.title,
    status: issue.status,
    severity: issue.severity,
    featureId: feature?.publicId ?? null,
    testCaseId: testCase?.publicId ?? null,
    fixNote: issue.fixNote ?? null,
  };
}

async function listIssues(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpListIssuesSchema.safeParse(input ?? {});
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const all = await listIssuesForProject(project.id);
  const issues = parsed.data.status ? all.filter((iss) => iss.status === parsed.data.status) : all;
  return toolOk({ issues: await Promise.all(issues.map((iss) => toMcpIssue(iss, project))) });
}

async function updateIssueStatusTool(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpUpdateIssueStatusSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const result = await updateIssueStatus(project, parsed.data.issueId, parsed.data.status, "Claude", "claude");
  if (!result.ok) return toolFail(result.error);

  return toolOk({ issue: await toMcpIssue(result.data.issue, project) });
}

async function recordIssueFixTool(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpRecordIssueFixSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const result = await recordIssueFix(project, parsed.data.issueId, parsed.data.fixNote, "Claude", "claude");
  if (!result.ok) return toolFail(result.error);

  return toolOk({ issue: await toMcpIssue(result.data.issue, project) });
}

async function startTestRunTool(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpStartTestRunSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const result = await startTestRun(project, parsed.data.testRunId, "Claude", "claude");
  if (!result.ok) return toolFail(result.error);

  return toolOk({ testRun: { runId: result.data.testRun.publicId, status: result.data.testRun.status } });
}

async function submitTestResultTool(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpSubmitTestResultSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const result = await submitTestResult(
    project,
    parsed.data.testRunId,
    parsed.data.testCaseId,
    {
      status: parsed.data.status,
      actualResult: parsed.data.actualResult,
      needsHumanReview: parsed.data.needsHumanReview,
      idempotencyKey: parsed.data.idempotencyKey,
    },
    "Claude",
    "claude",
  );
  if (!result.ok) return toolFail(result.error);

  // Hard business rule (03-CLAUDE-RULES.md): a fix does not verify an issue
  // — only an applicable passed rerun can. Applies the same as it does for
  // the manual runner, regardless of which entry point recorded the result.
  await applyRerunResultToIssuesForCase(project, result.data.testRun, parsed.data.testCaseId, result.data.result);

  return toolOk({
    result: {
      testCaseId: parsed.data.testCaseId,
      status: result.data.result.status,
      needsHumanReview: Boolean(result.data.result.needsHumanReview),
      recordedAt: result.data.result.recordedAt,
    },
    testRun: {
      runId: result.data.testRun.publicId,
      status: result.data.testRun.status,
      progress: computeRunProgress(await listTestResultsForRun(result.data.testRun.id)),
    },
  });
}

async function completeTestRunTool(project: Project, input: unknown): Promise<McpToolRunResult> {
  const parsed = mcpCompleteTestRunSchema.safeParse(input);
  if (!parsed.success) return toolFail(parsed.error.issues[0]?.message ?? "Invalid input.");

  const result = await completeTestRunFromClaude(project, parsed.data.testRunId, parsed.data.summary, "Claude");
  if (!result.ok) return toolFail(result.error);

  return toolOk({ progress: result.data.progress, needsReviewCount: result.data.needsReviewCount });
}

export async function runMcpTool(tool: McpToolName, project: Project, input: unknown): Promise<McpToolRunResult> {
  switch (tool) {
    case "health_check":
      return toolOk(healthCheck(project));
    case "get_project_context":
      return toolOk(await getProjectContext(project));
    case "list_features":
      return listFeatures(project, input);
    case "create_feature":
      return createFeature(project, input);
    case "update_feature":
      return updateFeature(project, input);
    case "list_test_cases":
      return listTestCases(project, input);
    case "create_test_case":
      return createTestCase(project, input);
    case "update_test_case":
      return updateTestCase(project, input);
    case "list_issues":
      return listIssues(project, input);
    case "update_issue_status":
      return updateIssueStatusTool(project, input);
    case "record_issue_fix":
      return recordIssueFixTool(project, input);
    case "start_test_run":
      return startTestRunTool(project, input);
    case "submit_test_result":
      return submitTestResultTool(project, input);
    case "complete_test_run":
      return completeTestRunTool(project, input);
  }
}
