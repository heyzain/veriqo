import "server-only";

import { randomUUID } from "node:crypto";

import { nextTestRunPublicId, type TestRunPublicIdPrefix } from "@/lib/ids/test-run-identifiers";
import { listActivityForProject, recordActivity } from "@/server/repositories/activity-repository";
import {
  findTestCaseByPublicId,
  findTestResult,
  findTestRunByPublicId,
  listTestCasesForProject,
  listTestResultsForRun,
  listTestRunsForProject as repoListTestRunsForProject,
  saveTestResult,
  saveTestRun,
  testRunPublicIds,
} from "@/server/repositories/project-repository";
import { advanceSetupStep } from "@/server/services/project-service";
import { resultStatuses, testRunStatuses, type ResultStatus, type TestExecutionMode } from "@/config/status.config";
import type { ActivityEvent, Project, TestCase, TestEvidence, TestResult, TestRun } from "@/types/domain";

/**
 * Business rules for manual test execution (Phase 6) — the same
 * result/error shape and project-scoping discipline `feature-service.ts` and
 * `test-case-service.ts` established for earlier phases.
 */

export type TestRunServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

function ok<T>(data: T): TestRunServiceResult<T> {
  return { ok: true, data };
}
function fail<T>(error: string): TestRunServiceResult<T> {
  return { ok: false, error };
}

async function activity(
  projectId: string,
  actorType: ActivityEvent["actorType"],
  actorName: string,
  action: string,
  entityType: string,
  entityId: string,
  extra?: Partial<Pick<ActivityEvent, "relatedEntities" | "metadata">>,
): Promise<void> {
  await recordActivity({
    id: randomUUID(),
    projectId,
    actorType,
    actorName,
    action,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
    ...extra,
  });
}

export async function listTestRunsForProject(project: Project): Promise<TestRun[]> {
  const runs = await repoListTestRunsForProject(project.id);
  return runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export type RunProgress = {
  total: number;
  notRun: number;
  pass: number;
  fail: number;
  partial: number;
  blocked: number;
};

export function computeRunProgress(results: readonly TestResult[]): RunProgress {
  const progress: RunProgress = { total: results.length, notRun: 0, pass: 0, fail: 0, partial: 0, blocked: 0 };
  for (const result of results) progress[result.status] += 1;
  return progress;
}

export type TestRunSummary = { testRun: TestRun; progress: RunProgress };

export async function listTestRunsWithProgress(project: Project): Promise<TestRunSummary[]> {
  const runs = await listTestRunsForProject(project);
  return Promise.all(
    runs.map(async (testRun) => ({
      testRun,
      progress: computeRunProgress(await listTestResultsForRun(testRun.id)),
    })),
  );
}

export type TestRunItem = { testCase: TestCase; result: TestResult };

export type TestRunDetail = {
  testRun: TestRun;
  items: TestRunItem[];
  progress: RunProgress;
  /** The first not-yet-recorded case, in run order — where "Resume" reopens the runner. */
  nextIncompleteTestCasePublicId: string | null;
};

export async function getTestRunDetail(project: Project, publicId: string): Promise<TestRunDetail | null> {
  const testRun = await findTestRunByPublicId(project.id, publicId);
  if (!testRun) return null;

  const [allTestCases, results] = await Promise.all([
    listTestCasesForProject(project.id),
    listTestResultsForRun(testRun.id),
  ]);

  const items: TestRunItem[] = [];
  for (const testCaseId of testRun.selectedTestCaseIds) {
    const testCase = allTestCases.find((tc) => tc.id === testCaseId);
    const result = results.find((r) => r.testCaseId === testCaseId);
    if (testCase && result) items.push({ testCase, result });
  }

  const nextIncomplete = items.find((item) => item.result.status === "notRun");

  return {
    testRun,
    items,
    progress: computeRunProgress(results),
    nextIncompleteTestCasePublicId: nextIncomplete?.testCase.publicId ?? null,
  };
}

// ---- Create-run flow ----

export type CreateTestRunInput = {
  name: string;
  build: string;
  environment: string;
  browser: string;
  assigneeName?: string;
  notes?: string;
  /** Test case public IDs, in the order the runner will step through them. */
  testCaseIds: string[];
  /** `RERUN` for a focused rerun created from an issue (`issue-service.createFocusedRerun`); defaults to `RUN`. */
  publicIdPrefix?: TestRunPublicIdPrefix;
  /**
   * Defaults to `manual` (Phase 6/7's runner). `claudeAssisted` (Phase 8)
   * submits results over MCP instead. `veriqoAutomated` is driven through
   * `server/automation/` rather than this input in Phase 0.
   */
  executionMode?: TestExecutionMode;
};

export async function createTestRun(
  project: Project,
  input: CreateTestRunInput,
  actorName: string,
): Promise<TestRunServiceResult<{ testRun: TestRun; project: Project }>> {
  const seen = new Set<string>();
  const resolvedCases: TestCase[] = [];
  for (const publicId of input.testCaseIds) {
    if (seen.has(publicId)) continue;
    seen.add(publicId);
    const testCase = await findTestCaseByPublicId(project.id, publicId);
    if (!testCase) return fail(`Unknown test case "${publicId}".`);
    if (testCase.status === "archived") return fail(`${publicId} is archived and can't be added to a run.`);
    resolvedCases.push(testCase);
  }
  if (resolvedCases.length === 0) return fail("Select at least one test case to include in this run.");

  const now = new Date().toISOString();
  const testRun: TestRun = {
    id: randomUUID(),
    publicId: nextTestRunPublicId(input.publicIdPrefix ?? "RUN", await testRunPublicIds(project.id)),
    projectId: project.id,
    name: input.name.trim(),
    status: "planned",
    build: input.build.trim(),
    environment: input.environment.trim(),
    browser: input.browser.trim(),
    assigneeName: input.assigneeName?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    executionMode: input.executionMode ?? "manual",
    selectedTestCaseIds: resolvedCases.map((tc) => tc.id),
    createdBySource: "human",
    createdByName: actorName,
    createdAt: now,
    updatedAt: now,
  };
  await saveTestRun(testRun);

  for (const testCase of resolvedCases) {
    await saveTestResult({
      id: randomUUID(),
      testRunId: testRun.id,
      testCaseId: testCase.id,
      status: "notRun",
      evidence: [],
      recordedBySource: "system",
      recordedAt: now,
      updatedAt: now,
    });
  }

  const updatedProject = await advanceSetupStep(project, 6);

  await activity(
    project.id,
    "human",
    actorName,
    `created ${testRun.publicId} — ${testRun.name} with ${resolvedCases.length} test case${resolvedCases.length === 1 ? "" : "s"} selected`,
    "testRun",
    testRun.id,
    { relatedEntities: resolvedCases.map((tc) => ({ type: "testCase", id: tc.id })) },
  );

  if (updatedProject !== project) {
    await activity(project.id, "system", "Veriqo", "marked the first test run created", "testRun", testRun.id);
  }

  return ok({ testRun, project: updatedProject });
}

// ---- Run lifecycle ----

export async function startTestRun(
  project: Project,
  publicId: string,
  actorName: string,
  actorType: ActivityEvent["actorType"] = "human",
): Promise<TestRunServiceResult<{ testRun: TestRun }>> {
  const existing = await findTestRunByPublicId(project.id, publicId);
  if (!existing) return fail("Test run not found.");
  if (existing.status === "inProgress") return ok({ testRun: existing });
  if (existing.status !== "planned" && existing.status !== "paused") {
    return fail(`${publicId} is ${testRunStatuses[existing.status].label.toLowerCase()} and can't be started.`);
  }

  const now = new Date().toISOString();
  const wasPaused = existing.status === "paused";
  const updated: TestRun = {
    ...existing,
    status: "inProgress",
    startedAt: existing.startedAt ?? now,
    updatedAt: now,
  };
  await saveTestRun(updated);

  await activity(
    project.id,
    actorType,
    actorName,
    wasPaused ? `resumed ${updated.publicId}` : `started ${updated.publicId}`,
    "testRun",
    updated.id,
  );

  return ok({ testRun: updated });
}

export async function pauseTestRun(
  project: Project,
  publicId: string,
  actorName: string,
): Promise<TestRunServiceResult<{ testRun: TestRun }>> {
  const existing = await findTestRunByPublicId(project.id, publicId);
  if (!existing) return fail("Test run not found.");
  if (existing.status === "paused") return ok({ testRun: existing });
  if (existing.status !== "inProgress") return fail(`${publicId} isn't in progress.`);

  const now = new Date().toISOString();
  const updated: TestRun = { ...existing, status: "paused", updatedAt: now };
  await saveTestRun(updated);

  await activity(project.id, "human", actorName, `paused ${updated.publicId}`, "testRun", updated.id);

  return ok({ testRun: updated });
}

// ---- Recording results ----

export type SubmitTestResultInput = {
  status: Exclude<ResultStatus, "notRun">;
  actualResult?: string;
  evidence?: TestEvidence[];
  /** Claude sets this when it isn't confident in the result (Phase 8) — ignored (forced to `false`) for a human submission, since a human's own entry never needs reviewing itself. */
  needsHumanReview?: boolean;
  /** MCP-only — see `TestResult.idempotencyKey`. */
  idempotencyKey?: string;
};

/**
 * Records one case's result within a run. Starts a `planned` run and resumes
 * a `paused` one — recording a result is the actor actively working it.
 * Once every selected case has a result, the run auto-completes: `completed`
 * if every result passed, `needsAttention` if any failed (Phase 6
 * acceptance: "Run detail connects results to cases/features" via a
 * status that reflects the outcome, not just "done"). Editing a result after
 * completion clears `completedAt` until every case has one again.
 *
 * Used for both the manual runner (`actorType: "human"`, the default) and
 * the `submit_test_result` MCP tool (`actorType: "claude"`) — and, via the
 * default, for a human's Correct action on a Claude result, which is
 * intentionally just this same call: the human becomes the result's current
 * author, same as any other re-submission (Phase 8, "Human review of
 * uncertain results").
 */
export async function submitTestResult(
  project: Project,
  runPublicId: string,
  testCasePublicId: string,
  input: SubmitTestResultInput,
  actorName: string,
  actorType: ActivityEvent["actorType"] = "human",
): Promise<TestRunServiceResult<{ testRun: TestRun; result: TestResult }>> {
  const testRun = await findTestRunByPublicId(project.id, runPublicId);
  if (!testRun) return fail("Test run not found.");

  const testCase = await findTestCaseByPublicId(project.id, testCasePublicId);
  if (!testCase) return fail("Test case not found.");
  if (!testRun.selectedTestCaseIds.includes(testCase.id)) {
    return fail(`${testCasePublicId} isn't part of ${runPublicId}.`);
  }

  if (input.status !== "pass" && !input.actualResult?.trim()) {
    return fail("Describe what happened before recording a fail, partial, or blocked result.");
  }

  const existingResult = await findTestResult(testRun.id, testCase.id);
  if (!existingResult) return fail("Result record missing for this test case — the run may be corrupted.");

  // Idempotent replay (04-CONFIG-BLUEPRINT.md, "Use idempotency keys for MCP
  // writes and retried mutations"): a retried `submit_test_result` call with
  // the same key returns the already-recorded result instead of reprocessing
  // it — so a network retry can never double-log activity or double-apply
  // the issue verify/reopen rule.
  if (input.idempotencyKey && existingResult.idempotencyKey === input.idempotencyKey) {
    return ok({ testRun, result: existingResult });
  }

  const now = new Date().toISOString();
  const updatedResult: TestResult = {
    ...existingResult,
    status: input.status,
    actualResult: input.actualResult?.trim() || undefined,
    evidence: input.evidence ?? existingResult.evidence,
    needsHumanReview: actorType === "claude" ? Boolean(input.needsHumanReview) : false,
    reviewedBySource: undefined,
    reviewedByName: undefined,
    reviewedAt: undefined,
    idempotencyKey: input.idempotencyKey,
    recordedBySource: actorType,
    recordedByName: actorName,
    recordedAt: now,
    updatedAt: now,
  };
  await saveTestResult(updatedResult);

  let updatedRun: TestRun =
    testRun.status === "planned" || testRun.status === "paused"
      ? { ...testRun, status: "inProgress", startedAt: testRun.startedAt ?? now, updatedAt: now }
      : testRun;

  const resultsForRun = await listTestResultsForRun(testRun.id);
  const allResults = resultsForRun.map((r) => (r.id === updatedResult.id ? updatedResult : r));
  const everyCaseHasResult = allResults.every((r) => r.status !== "notRun");
  const wasCompleteBefore = updatedRun.status === "completed" || updatedRun.status === "needsAttention";

  // Results only ever move forward (`notRun` → a recorded status), so once
  // `everyCaseHasResult` is true it stays true — there's no "reopened"
  // branch to handle here, only a possible completed ⇄ needsAttention flip
  // when an already-recorded result is edited to a different outcome.
  if (everyCaseHasResult) {
    const hasFailure = allResults.some((r) => r.status === "fail");
    updatedRun = { ...updatedRun, status: hasFailure ? "needsAttention" : "completed", completedAt: now, updatedAt: now };
  }
  if (updatedRun !== testRun) await saveTestRun(updatedRun);

  await activity(
    project.id,
    actorType,
    actorName,
    `recorded ${resultStatuses[input.status].label.toLowerCase()} for ${testCase.publicId} in ${testRun.publicId}` +
      (updatedResult.needsHumanReview ? " — flagged for human review" : ""),
    "testResult",
    updatedResult.id,
    {
      relatedEntities: [
        { type: "testCase", id: testCase.id },
        { type: "testRun", id: testRun.id },
      ],
    },
  );

  if (everyCaseHasResult && !wasCompleteBefore) {
    await activity(
      project.id,
      "system",
      "Veriqo",
      updatedRun.status === "needsAttention"
        ? `marked ${updatedRun.publicId} needs attention — at least one test failed`
        : `marked ${updatedRun.publicId} completed — every selected test case has a result`,
      "testRun",
      updatedRun.id,
    );
  }

  return ok({ testRun: updatedRun, result: updatedResult });
}

// ---- Human review of a Claude-submitted result ----

/**
 * Accepts a Claude-flagged result as-is — leaves `recordedBy*` untouched
 * (Claude is still the content's author) and stamps `reviewedBy*` alongside
 * it, so the UI can show both "Recorded by Claude" and "Reviewed by
 * {human}" (Phase 8 acceptance: "Human review is clearly distinct from AI
 * submission").
 */
export async function approveClaudeResult(
  project: Project,
  runPublicId: string,
  testCasePublicId: string,
  actorName: string,
): Promise<TestRunServiceResult<{ result: TestResult }>> {
  const testRun = await findTestRunByPublicId(project.id, runPublicId);
  if (!testRun) return fail("Test run not found.");
  const testCase = await findTestCaseByPublicId(project.id, testCasePublicId);
  if (!testCase) return fail("Test case not found.");
  const existing = await findTestResult(testRun.id, testCase.id);
  if (!existing) return fail("Result not found.");
  if (existing.recordedBySource !== "claude") return fail("Only a Claude-submitted result can be approved.");
  if (!existing.needsHumanReview) return ok({ result: existing });

  const now = new Date().toISOString();
  const updated: TestResult = {
    ...existing,
    needsHumanReview: false,
    reviewedBySource: "human",
    reviewedByName: actorName,
    reviewedAt: now,
    updatedAt: now,
  };
  await saveTestResult(updated);

  await activity(
    project.id,
    "human",
    actorName,
    `approved Claude's result for ${testCase.publicId} in ${testRun.publicId}`,
    "testResult",
    updated.id,
    { relatedEntities: [{ type: "testCase", id: testCase.id }, { type: "testRun", id: testRun.id }] },
  );

  return ok({ result: updated });
}

/**
 * Discards a Claude-submitted result back to `notRun` — the case needs
 * re-execution, by Claude or a human. The rejection itself is preserved in
 * the activity ledger even though the live record reverts to the same
 * neutral placeholder `createTestRun` seeds every case with.
 */
export async function rejectClaudeResult(
  project: Project,
  runPublicId: string,
  testCasePublicId: string,
  actorName: string,
): Promise<TestRunServiceResult<{ testRun: TestRun; result: TestResult }>> {
  const testRun = await findTestRunByPublicId(project.id, runPublicId);
  if (!testRun) return fail("Test run not found.");
  const testCase = await findTestCaseByPublicId(project.id, testCasePublicId);
  if (!testCase) return fail("Test case not found.");
  const existing = await findTestResult(testRun.id, testCase.id);
  if (!existing) return fail("Result not found.");
  if (existing.recordedBySource !== "claude") return fail("Only a Claude-submitted result can be rejected.");

  const now = new Date().toISOString();
  const reverted: TestResult = {
    ...existing,
    status: "notRun",
    actualResult: undefined,
    evidence: [],
    needsHumanReview: false,
    reviewedBySource: undefined,
    reviewedByName: undefined,
    reviewedAt: undefined,
    idempotencyKey: undefined,
    recordedBySource: "system",
    recordedByName: undefined,
    recordedAt: now,
    updatedAt: now,
  };
  await saveTestResult(reverted);

  // A case reverting to notRun means the run can no longer be "done".
  let updatedRun = testRun;
  if (testRun.status === "completed" || testRun.status === "needsAttention") {
    updatedRun = { ...testRun, status: "inProgress", completedAt: undefined, updatedAt: now };
    await saveTestRun(updatedRun);
  }

  await activity(
    project.id,
    "human",
    actorName,
    `rejected Claude's result for ${testCase.publicId} in ${testRun.publicId} — needs re-execution`,
    "testResult",
    reverted.id,
    { relatedEntities: [{ type: "testCase", id: testCase.id }, { type: "testRun", id: testRun.id }] },
  );

  return ok({ testRun: updatedRun, result: reverted });
}

// ---- Claude signals it's done with its assisted pass ----

export type CompleteTestRunSummary = { progress: RunProgress; needsReviewCount: number };

export async function completeTestRunFromClaude(
  project: Project,
  runPublicId: string,
  summaryNote: string | undefined,
  actorName: string,
): Promise<TestRunServiceResult<CompleteTestRunSummary>> {
  const testRun = await findTestRunByPublicId(project.id, runPublicId);
  if (!testRun) return fail("Test run not found.");

  const results = await listTestResultsForRun(testRun.id);
  const progress = computeRunProgress(results);
  const needsReviewCount = results.filter((r) => r.needsHumanReview).length;

  await activity(
    project.id,
    "claude",
    actorName,
    summaryNote ? `completed its assisted pass on ${testRun.publicId} — ${summaryNote}` : `completed its assisted pass on ${testRun.publicId}`,
    "testRun",
    testRun.id,
    { metadata: { progress, needsReviewCount } },
  );

  return ok({ progress, needsReviewCount });
}

// ---- Activity for the run detail page ----

export async function getTestRunActivity(project: Project, testRun: TestRun): Promise<ActivityEvent[]> {
  const allActivity = await listActivityForProject(project.id);
  return allActivity.filter(
    (event) =>
      (event.entityType === "testRun" || event.entityType === "testResult") &&
      (event.entityId === testRun.id ||
        event.relatedEntities?.some((related) => related.type === "testRun" && related.id === testRun.id)),
  );
}

export type TestRunActivitySince = { events: ActivityEvent[] };

/**
 * Takes the run's public ID, not its internal `id` — mirrors
 * `issue-service.getIssueActivitySince`. Backs the Claude-assisted
 * execution panel's live poll (Phase 8).
 */
export async function getTestRunActivitySince(
  project: Project,
  publicId: string,
  sinceIso: string,
): Promise<TestRunActivitySince> {
  const testRun = await findTestRunByPublicId(project.id, publicId);
  if (!testRun) return { events: [] };

  const since = new Date(sinceIso).getTime();
  const runActivity = await getTestRunActivity(project, testRun);
  const events = runActivity
    .filter((event) => new Date(event.createdAt).getTime() > since)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30);

  return { events };
}
