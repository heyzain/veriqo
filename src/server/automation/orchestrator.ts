import "server-only";

import { findTestCaseByPublicId, findTestRunByPublicId } from "@/server/repositories/project-repository";
import { NotImplementedAutomationExecutor } from "@/server/automation/executor";
import type { AutomationExecutionContext, AutomationExecutor } from "@/server/automation/types";
import { applyRerunResultToIssuesForCase } from "@/server/services/issue-service";
import { submitTestResult, type TestRunServiceResult } from "@/server/services/test-run-service";
import type { Project, TestResult, TestRun } from "@/types/domain";

/**
 * The orchestration boundary between a `veriqoAutomated` `TestRun` and a
 * future execution engine (docs/05-NATIVE-AUTOMATION.md):
 *
 *   AI / Playwright → AutomationExecutor → AutomationOrchestrator (this file)
 *     → existing Veriqo services → repositories → MongoDB
 *
 * Every write this makes goes through the same services every other
 * execution source uses — `submitTestResult`, `applyRerunResultToIssuesForCase`
 * — never a direct repository or database write. That means a future
 * executor inherits every existing invariant for free: project scoping,
 * idempotency, the rerun-gated verification rule, and legal `TestRun`/
 * `Issue` status transitions. Nothing here can verify an issue directly,
 * skip a rerun, or write an arbitrary result status — those rules live in
 * `test-run-service.ts`/`issue-service.ts` and apply regardless of who calls
 * them.
 */

export type AutomationServiceResult<T> = TestRunServiceResult<T>;

function ok<T>(data: T): AutomationServiceResult<T> {
  return { ok: true, data };
}
function fail<T>(error: string): AutomationServiceResult<T> {
  return { ok: false, error };
}

/** Actor identity recorded for every write this orchestrator makes — see `ActorType.automation` (status.config.ts). */
const AUTOMATION_ACTOR_NAME = "Veriqo Automation";

/** Phase 0 has no execution engine; a later phase passes a real one into `startAutomationExecution`. */
const defaultExecutor: AutomationExecutor = new NotImplementedAutomationExecutor();

/**
 * Resolves one test case within a `veriqoAutomated` run into its
 * `AutomationExecutionContext`. Both lookups are scoped to `project.id`
 * (`project-repository.ts`'s existing ownership discipline), and the test
 * case must actually belong to this run's `selectedTestCaseIds` — together
 * these make it structurally impossible to execute a case from one project
 * while writing its result into another (04-CONFIG-BLUEPRINT.md,
 * "Project-scoped actions must verify project ownership server-side").
 */
export async function buildAutomationExecutionContext(
  project: Project,
  runPublicId: string,
  testCasePublicId: string,
): Promise<AutomationServiceResult<AutomationExecutionContext>> {
  const testRun = await findTestRunByPublicId(project.id, runPublicId);
  if (!testRun) return fail("Test run not found.");
  if (testRun.executionMode !== "veriqoAutomated") {
    return fail(`${runPublicId} isn't a Veriqo automated run.`);
  }

  const testCase = await findTestCaseByPublicId(project.id, testCasePublicId);
  if (!testCase) return fail("Test case not found.");
  if (!testRun.selectedTestCaseIds.includes(testCase.id)) {
    return fail(`${testCasePublicId} isn't part of ${runPublicId}.`);
  }

  return ok({
    projectId: project.id,
    featureId: testCase.featureId,
    testCaseId: testCase.id,
    testRunId: testRun.id,
  });
}

/**
 * Runs native automated execution of one test case and records its outcome
 * through the same result-submission path the manual runner and Claude's
 * `submit_test_result` MCP tool use — so the run auto-completes, the
 * activity ledger records it (attributed to `automation`, never `claude`),
 * and an applicable focused rerun verifies/reopens its issue exactly as it
 * would from any other execution source (issue-service.ts,
 * "Verify / reopen — the hard business rule").
 *
 * `executor` is injectable (tests pass a fake); production callers get
 * `defaultExecutor`, which always refuses — Phase 0 ships no execution
 * engine, so this can run end-to-end in tests without ever pretending a
 * browser test happened in the product itself.
 */
export async function startAutomationExecution(
  project: Project,
  runPublicId: string,
  testCasePublicId: string,
  executor: AutomationExecutor = defaultExecutor,
): Promise<AutomationServiceResult<{ testRun: TestRun; result: TestResult }>> {
  const contextResult = await buildAutomationExecutionContext(project, runPublicId, testCasePublicId);
  if (!contextResult.ok) return contextResult;

  let outcome;
  try {
    outcome = await executor.execute(contextResult.data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Automated execution failed.");
  }

  const submitted = await submitTestResult(
    project,
    runPublicId,
    testCasePublicId,
    { status: outcome.status, actualResult: outcome.actualResult },
    AUTOMATION_ACTOR_NAME,
    "automation",
  );
  if (!submitted.ok) return submitted;

  // Hard business rule (03-CLAUDE-RULES.md): a fix does not verify an issue
  // — only an applicable passed rerun can. Applied here exactly as it is
  // for the manual runner (`test-runs/actions.ts`) and the MCP tool
  // (`mcp/tools.ts`), so a `veriqoAutomated` rerun closes the trust loop the
  // same way every other execution source does.
  await applyRerunResultToIssuesForCase(project, submitted.data.testRun, testCasePublicId, submitted.data.result);

  return ok(submitted.data);
}
