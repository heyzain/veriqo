import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

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
} from "@/features/test-runs/schemas";
import { logMcpActivity } from "@/server/mcp/activity";
import { mcpToolNames, runMcpTool, type McpToolName, type McpToolRunResult } from "@/server/mcp/tools";
import type { Project } from "@/types/domain";

/**
 * The real MCP server behind `/api/mcp/[slug]` — what
 * `mcp-setup-instructions.tsx` actually promises when it tells a user to run
 * `claude mcp add --transport http`. Every tool's business logic still lives
 * in `tools.ts`'s `runMcpTool` (project-scoping, validation, and the
 * service-layer calls it delegates to are unchanged); this file only adds
 * the real MCP framing around that already-correct dispatcher — tool
 * metadata for `tools/list`, and mapping `McpToolRunResult` to MCP's
 * `CallToolResult` shape.
 */

/**
 * Generic "Claude ran a tool" activity line for read-only tools.
 * `create_feature`/`update_feature`, the issue-lifecycle tools, and the
 * test-run tools are deliberately absent — their own service layer
 * (`feature-service.ts`, `issue-service.ts`, `test-run-service.ts`) already
 * records a specific, useful line for those, and logging both here too
 * would duplicate the ledger entry for one MCP call.
 */
const toolActionLabel: Partial<Record<McpToolName, string>> = {
  health_check: "ran a health check over MCP",
  get_project_context: "read the project QA context over MCP",
  list_features: "listed features over MCP",
  list_test_cases: "listed test cases over MCP",
  list_issues: "listed issues over MCP",
};

const toolDescriptions: Record<McpToolName, string> = {
  health_check: "Check that the MCP connection to this Veriqo project is alive.",
  get_project_context:
    "Read the project's QA context: description, app URL, environment, repository, setup progress, and record counts.",
  list_features: "List discovered features for this project, optionally filtered by status.",
  create_feature:
    "Record a newly discovered feature. Starts in needsReview — a human approves it before it's trusted.",
  update_feature: "Propose an update to an existing feature (by its public ID) after re-analyzing the codebase.",
  list_test_cases: "List test cases for this project, optionally filtered by status and/or parent feature.",
  create_test_case: "Generate a new test case for an approved feature. Starts in inReview.",
  update_test_case: "Propose an update to an existing test case (by its public ID).",
  list_issues: "List issues for this project, optionally filtered by status.",
  update_issue_status: "Move an issue between Open, Investigating, and Fix in progress.",
  record_issue_fix: "Record what the fix was for an issue, moving it to Fix in progress.",
  start_test_run: "Start (or resume) a Claude-assisted test run.",
  submit_test_result:
    "Record a result for one test case within a run. Set needsHumanReview if the result isn't certain.",
  complete_test_run: "Signal that Claude's assisted pass over a test run is done.",
};

/**
 * `mcpSubmitTestResultSchema` is a `.superRefine`-wrapped `ZodEffects`, not
 * a plain `ZodObject`, so it has no `.shape` to register with. This mirrors
 * its fields for `tools/list` introspection only — `tools.ts`'s
 * `submitTestResultTool` still validates every call against the real schema
 * (cross-field rule included), so a looser registration shape here can't
 * let anything invalid through.
 */
const submitTestResultInputShape = {
  testRunId: z.string().trim().min(1, "testRunId (the run's public ID) is required."),
  testCaseId: z.string().trim().min(1, "testCaseId (the test case's public ID) is required."),
  status: z.enum(["pass", "fail", "partial", "blocked"]),
  actualResult: z.string().trim().max(2000).optional(),
  needsHumanReview: z.boolean().optional(),
  idempotencyKey: z.string().trim().max(120).optional(),
};

const toolInputShapes: Partial<Record<McpToolName, z.ZodRawShape>> = {
  list_features: mcpListFeaturesSchema.shape,
  create_feature: mcpCreateFeatureSchema.shape,
  update_feature: mcpUpdateFeatureSchema.shape,
  list_test_cases: mcpListTestCasesSchema.shape,
  create_test_case: mcpCreateTestCaseSchema.shape,
  update_test_case: mcpUpdateTestCaseSchema.shape,
  list_issues: mcpListIssuesSchema.shape,
  update_issue_status: mcpUpdateIssueStatusSchema.shape,
  record_issue_fix: mcpRecordIssueFixSchema.shape,
  start_test_run: mcpStartTestRunSchema.shape,
  submit_test_result: submitTestResultInputShape,
  complete_test_run: mcpCompleteTestRunSchema.shape,
  // health_check / get_project_context take no input.
};

function toCallToolResult(result: McpToolRunResult): CallToolResult {
  if (result.ok) {
    return { content: [{ type: "text", text: JSON.stringify(result.result) }] };
  }
  return { content: [{ type: "text", text: result.error }], isError: true };
}

/**
 * Builds a fresh, project-scoped `McpServer` with every tool registered —
 * called once per request in stateless mode (`mcp-service.ts`), so there's
 * no server-side session state to leak between projects or requests.
 * `credentialId` is only used as the activity ledger's `entityId` for
 * generic tool-call logging, mirroring what the credential-scoped
 * connection/audit trail already recorded before this file existed.
 */
export function buildMcpServer(project: Project, credentialId: string): McpServer {
  const server = new McpServer({ name: "veriqo", version: "1.0.0" });

  for (const name of mcpToolNames) {
    server.registerTool(
      name,
      {
        description: toolDescriptions[name],
        inputSchema: toolInputShapes[name],
      },
      async (args: unknown): Promise<CallToolResult> => {
        const result = await runMcpTool(name, project, args);

        const label = toolActionLabel[name];
        if (label) {
          await logMcpActivity(project.id, "claude", "Claude", label, credentialId);
        }

        return toCallToolResult(result);
      },
    );
  }

  return server;
}
