import "server-only";

import type { ResultStatus } from "@/config/status.config";

/**
 * The native Veriqo automation domain boundary (Phase 0 — see
 * docs/05-NATIVE-AUTOMATION.md). Establishes the contract a future
 * execution engine (Playwright or otherwise) implements to run a
 * `veriqoAutomated` `TestRun`'s test cases — without this boundary knowing
 * anything about browsers, the DOM, or Playwright itself. That stays the
 * next phase's concern; this one only fixes the shape of what goes in and
 * what comes out.
 */

/**
 * A typed handle to one test case within one test run — real domain IDs,
 * not full `Project`/`TestCase` objects, since an executor resolves
 * whatever else it needs (steps, expected result, the project's `appUrl`,
 * ...) itself, scoped to these IDs. `automation/orchestrator.ts` is the only
 * place that builds one of these, always from a project-scoped lookup, so a
 * context can never straddle two projects.
 */
export type AutomationExecutionContext = {
  projectId: string;
  featureId?: string;
  testCaseId: string;
  testRunId: string;
};

/**
 * What one executor run reports back. Reuses `TestResult`'s own status
 * vocabulary (`ResultStatus`, minus `notRun` — an executor either produces a
 * real outcome or throws) rather than inventing a second pass/fail
 * vocabulary (03-CLAUDE-RULES.md convention, mirrored from
 * `test-run-service.SubmitTestResultInput`). `automation/orchestrator.ts` is
 * the only thing allowed to turn this into a real `TestResult`, and only
 * through the existing `submitTestResult` service — never a direct write.
 */
export type AutomationExecutionOutcome = {
  status: Exclude<ResultStatus, "notRun">;
  actualResult?: string;
  durationMs?: number;
};

/**
 * Contract a future execution engine implements to run one test case.
 * Deliberately has no knowledge of `@playwright/test` or any browser
 * primitive — see "Playwright boundary" in docs/05-NATIVE-AUTOMATION.md.
 * `automation/executor.ts`'s `NotImplementedAutomationExecutor` is the only
 * implementation Phase 0 ships.
 */
export interface AutomationExecutor {
  execute(context: AutomationExecutionContext): Promise<AutomationExecutionOutcome>;
}
