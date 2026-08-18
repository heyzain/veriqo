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
import { resultStatuses, testRunStatuses, type ResultStatus } from "@/config/status.config";
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

function activity(
  projectId: string,
  actorType: ActivityEvent["actorType"],
  actorName: string,
  action: string,
  entityType: string,
  entityId: string,
  extra?: Partial<Pick<ActivityEvent, "relatedEntities" | "metadata">>,
): void {
  recordActivity({
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

export function listTestRunsForProject(project: Project): TestRun[] {
  return repoListTestRunsForProject(project.id).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
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

export function listTestRunsWithProgress(project: Project): TestRunSummary[] {
  return listTestRunsForProject(project).map((testRun) => ({
    testRun,
    progress: computeRunProgress(listTestResultsForRun(testRun.id)),
  }));
}

export type TestRunItem = { testCase: TestCase; result: TestResult };

export type TestRunDetail = {
  testRun: TestRun;
  items: TestRunItem[];
  progress: RunProgress;
  /** The first not-yet-recorded case, in run order — where "Resume" reopens the runner. */
  nextIncompleteTestCasePublicId: string | null;
};

export function getTestRunDetail(project: Project, publicId: string): TestRunDetail | null {
  const testRun = findTestRunByPublicId(project.id, publicId);
  if (!testRun) return null;

  const allTestCases = listTestCasesForProject(project.id);
  const results = listTestResultsForRun(testRun.id);

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
};

export function createTestRun(
  project: Project,
  input: CreateTestRunInput,
  actorName: string,
): TestRunServiceResult<{ testRun: TestRun; project: Project }> {
  const seen = new Set<string>();
  const resolvedCases: TestCase[] = [];
  for (const publicId of input.testCaseIds) {
    if (seen.has(publicId)) continue;
    seen.add(publicId);
    const testCase = findTestCaseByPublicId(project.id, publicId);
    if (!testCase) return fail(`Unknown test case "${publicId}".`);
    if (testCase.status === "archived") return fail(`${publicId} is archived and can't be added to a run.`);
    resolvedCases.push(testCase);
  }
  if (resolvedCases.length === 0) return fail("Select at least one test case to include in this run.");

  const now = new Date().toISOString();
  const testRun: TestRun = {
    id: randomUUID(),
    publicId: nextTestRunPublicId(input.publicIdPrefix ?? "RUN", testRunPublicIds(project.id)),
    projectId: project.id,
    name: input.name.trim(),
    status: "planned",
    build: input.build.trim(),
    environment: input.environment.trim(),
    browser: input.browser.trim(),
    assigneeName: input.assigneeName?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    selectedTestCaseIds: resolvedCases.map((tc) => tc.id),
    createdBySource: "human",
    createdByName: actorName,
    createdAt: now,
    updatedAt: now,
  };
  saveTestRun(testRun);

  for (const testCase of resolvedCases) {
    saveTestResult({
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

  const updatedProject = advanceSetupStep(project, 6);

  activity(
    project.id,
    "human",
    actorName,
    `created ${testRun.publicId} — ${testRun.name} with ${resolvedCases.length} test case${resolvedCases.length === 1 ? "" : "s"} selected`,
    "testRun",
    testRun.id,
    { relatedEntities: resolvedCases.map((tc) => ({ type: "testCase", id: tc.id })) },
  );

  if (updatedProject !== project) {
    activity(project.id, "system", "Veriqo", "marked the first test run created", "testRun", testRun.id);
  }

  return ok({ testRun, project: updatedProject });
}

// ---- Run lifecycle ----

export function startTestRun(
  project: Project,
  publicId: string,
  actorName: string,
): TestRunServiceResult<{ testRun: TestRun }> {
  const existing = findTestRunByPublicId(project.id, publicId);
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
  saveTestRun(updated);

  activity(
    project.id,
    "human",
    actorName,
    wasPaused ? `resumed ${updated.publicId}` : `started ${updated.publicId}`,
    "testRun",
    updated.id,
  );

  return ok({ testRun: updated });
}

export function pauseTestRun(
  project: Project,
  publicId: string,
  actorName: string,
): TestRunServiceResult<{ testRun: TestRun }> {
  const existing = findTestRunByPublicId(project.id, publicId);
  if (!existing) return fail("Test run not found.");
  if (existing.status === "paused") return ok({ testRun: existing });
  if (existing.status !== "inProgress") return fail(`${publicId} isn't in progress.`);

  const now = new Date().toISOString();
  const updated: TestRun = { ...existing, status: "paused", updatedAt: now };
  saveTestRun(updated);

  activity(project.id, "human", actorName, `paused ${updated.publicId}`, "testRun", updated.id);

  return ok({ testRun: updated });
}

// ---- Recording results ----

export type SubmitTestResultInput = {
  status: Exclude<ResultStatus, "notRun">;
  actualResult?: string;
  evidence?: TestEvidence[];
};

/**
 * Records one case's result within a run. Starts a `planned` run and resumes
 * a `paused` one — recording a result is the human actively working it.
 * Once every selected case has a result, the run auto-completes: `completed`
 * if every result passed, `needsAttention` if any failed (Phase 6
 * acceptance: "Run detail connects results to cases/features" via a
 * status that reflects the outcome, not just "done"). Editing a result after
 * completion clears `completedAt` until every case has one again.
 */
export function submitTestResult(
  project: Project,
  runPublicId: string,
  testCasePublicId: string,
  input: SubmitTestResultInput,
  actorName: string,
): TestRunServiceResult<{ testRun: TestRun; result: TestResult }> {
  const testRun = findTestRunByPublicId(project.id, runPublicId);
  if (!testRun) return fail("Test run not found.");

  const testCase = findTestCaseByPublicId(project.id, testCasePublicId);
  if (!testCase) return fail("Test case not found.");
  if (!testRun.selectedTestCaseIds.includes(testCase.id)) {
    return fail(`${testCasePublicId} isn't part of ${runPublicId}.`);
  }

  if (input.status !== "pass" && !input.actualResult?.trim()) {
    return fail("Describe what happened before recording a fail, partial, or blocked result.");
  }

  const existingResult = findTestResult(testRun.id, testCase.id);
  if (!existingResult) return fail("Result record missing for this test case — the run may be corrupted.");

  const now = new Date().toISOString();
  const updatedResult: TestResult = {
    ...existingResult,
    status: input.status,
    actualResult: input.actualResult?.trim() || undefined,
    evidence: input.evidence ?? existingResult.evidence,
    recordedBySource: "human",
    recordedByName: actorName,
    recordedAt: now,
    updatedAt: now,
  };
  saveTestResult(updatedResult);

  let updatedRun: TestRun =
    testRun.status === "planned" || testRun.status === "paused"
      ? { ...testRun, status: "inProgress", startedAt: testRun.startedAt ?? now, updatedAt: now }
      : testRun;

  const allResults = listTestResultsForRun(testRun.id).map((r) => (r.id === updatedResult.id ? updatedResult : r));
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
  if (updatedRun !== testRun) saveTestRun(updatedRun);

  activity(
    project.id,
    "human",
    actorName,
    `recorded ${resultStatuses[input.status].label.toLowerCase()} for ${testCase.publicId} in ${testRun.publicId}`,
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
    activity(
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

// ---- Activity for the run detail page ----

export function getTestRunActivity(project: Project, testRun: TestRun): ActivityEvent[] {
  return listActivityForProject(project.id).filter(
    (event) =>
      (event.entityType === "testRun" || event.entityType === "testResult") &&
      (event.entityId === testRun.id ||
        event.relatedEntities?.some((related) => related.type === "testRun" && related.id === testRun.id)),
  );
}
