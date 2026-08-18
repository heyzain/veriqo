import "server-only";

import { randomUUID } from "node:crypto";

import { issueInvestigationPrompt } from "@/prompts/issue-investigation/prompt";
import { nextIssuePublicId } from "@/lib/ids/issue-identifiers";
import { listActivityForProject, recordActivity } from "@/server/repositories/activity-repository";
import {
  findFeatureById,
  findIssueByOriginResultId,
  findIssueByPublicId,
  findTestCaseById,
  findTestCaseByPublicId,
  findTestResult,
  findTestResultById,
  findTestRunById,
  findTestRunByPublicId,
  issuePublicIds,
  listIssuesForProject as repoListIssuesForProject,
  saveIssue,
} from "@/server/repositories/project-repository";
import { createTestRun } from "@/server/services/test-run-service";
import { issueStatuses, resultStatuses, type IssueStatus } from "@/config/status.config";
import type { ActivityEvent, Feature, Issue, Project, RiskLevel, TestCase, TestResult, TestRun } from "@/types/domain";

/**
 * Business rules for the failure → issue → fix → rerun → verified trust loop
 * (Phase 7) — the same result/error shape and project-scoping discipline
 * `test-run-service.ts` and `feature-service.ts` established for earlier
 * phases.
 *
 * Hard business rule (03-CLAUDE-RULES.md): a fix does not verify an issue —
 * only an applicable passed rerun can. `verifyIssueFromPassedRerun` is the
 * one place that flips an issue to `verified`, and it's only ever reached
 * through `applyRerunResultToIssues`, which is only ever reached when a real
 * `TestResult` for the tracked rerun comes in.
 */

export type IssueServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

function ok<T>(data: T): IssueServiceResult<T> {
  return { ok: true, data };
}
function fail<T>(error: string): IssueServiceResult<T> {
  return { ok: false, error };
}

function activity(
  projectId: string,
  actorType: ActivityEvent["actorType"],
  actorName: string,
  action: string,
  entityId: string,
  extra?: Partial<Pick<ActivityEvent, "relatedEntities" | "metadata">>,
): void {
  recordActivity({
    id: randomUUID(),
    projectId,
    actorType,
    actorName,
    action,
    entityType: "issue",
    entityId,
    createdAt: new Date().toISOString(),
    ...extra,
  });
}

export function listIssuesForProject(project: Project): Issue[] {
  return repoListIssuesForProject(project.id).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type IssueDetail = {
  issue: Issue;
  feature: Feature | null;
  testCase: TestCase | null;
  originResult: TestResult | null;
  originTestRun: TestRun | null;
  rerunTestRun: TestRun | null;
  rerunResult: TestResult | null;
  activity: ActivityEvent[];
};

export function getIssueDetail(project: Project, publicId: string): IssueDetail | null {
  const issue = findIssueByPublicId(project.id, publicId);
  if (!issue) return null;

  const originResult = findTestResultById(project.id, issue.originResultId);
  const originTestRun = originResult ? findTestRunById(project.id, originResult.testRunId) : null;
  const rerunTestRun = issue.rerunTestRunId ? findTestRunById(project.id, issue.rerunTestRunId) : null;
  const rerunResult = issue.rerunResultId ? findTestResultById(project.id, issue.rerunResultId) : null;

  return {
    issue,
    feature: findFeatureById(project.id, issue.featureId),
    testCase: findTestCaseById(project.id, issue.testCaseId),
    originResult,
    originTestRun,
    rerunTestRun,
    rerunResult,
    activity: listActivityForProject(project.id).filter(
      (event) =>
        event.entityType === "issue" &&
        (event.entityId === issue.id || event.relatedEntities?.some((r) => r.type === "issue" && r.id === issue.id)),
    ),
  };
}

// ---- Create from a failed result ----

export type CreateIssueInput = {
  title: string;
  severity: RiskLevel;
};

/**
 * "Issues are created directly from failed test results" (issues list empty
 * state). Idempotent by origin result — retrying the same failed row never
 * opens a second issue for it (mirrors the MCP idempotency-key pattern, just
 * keyed by the result instead of a caller-supplied key since there's only
 * ever one legitimate issue per failure).
 */
export function createIssueFromFailedResult(
  project: Project,
  testRunPublicId: string,
  testCasePublicId: string,
  input: CreateIssueInput,
  actorName: string,
): IssueServiceResult<{ issue: Issue }> {
  const testRun = findTestRunByPublicId(project.id, testRunPublicId);
  if (!testRun) return fail("Test run not found.");
  const testCase = findTestCaseByPublicId(project.id, testCasePublicId);
  if (!testCase) return fail("Test case not found.");

  const result = findTestResult(testRun.id, testCase.id);
  if (!result) return fail("No recorded result for this test case in this run.");
  if (result.status !== "fail" && result.status !== "partial" && result.status !== "blocked") {
    return fail("Issues can only be created from a fail, partial, or blocked result.");
  }

  const existing = findIssueByOriginResultId(project.id, result.id);
  if (existing) return ok({ issue: existing });

  const now = new Date().toISOString();
  const issue: Issue = {
    id: randomUUID(),
    publicId: nextIssuePublicId(issuePublicIds(project.id)),
    projectId: project.id,
    featureId: testCase.featureId,
    testCaseId: testCase.id,
    originResultId: result.id,
    title: input.title.trim(),
    status: "open",
    severity: input.severity,
    createdBySource: "human",
    createdByName: actorName,
    createdAt: now,
    updatedAt: now,
  };
  saveIssue(issue);

  activity(
    project.id,
    "human",
    actorName,
    `opened ${issue.publicId} from a ${resultStatuses[result.status].label.toLowerCase()} result on ${testCase.publicId} in ${testRun.publicId}`,
    issue.id,
    {
      relatedEntities: [
        { type: "testCase", id: testCase.id },
        { type: "testRun", id: testRun.id },
        { type: "testResult", id: result.id },
      ],
    },
  );

  return ok({ issue });
}

// ---- Manual lifecycle ----

/**
 * Forward/backward moves the config already allows (Open ⇄ Investigating,
 * Investigating/Reopened → Fix in progress, Fix in progress → Open) —
 * `status.config.ts`'s `transitions` list is the single source of truth for
 * what's legal, enforced here rather than trusted from the caller.
 * `readyForRetest`/`verified`/`reopened` are reached only through the more
 * specific actions below, never through this generic setter.
 */
export function updateIssueStatus(
  project: Project,
  publicId: string,
  nextStatus: Extract<IssueStatus, "open" | "investigating" | "fixInProgress">,
  actorName: string,
  actorType: ActivityEvent["actorType"] = "human",
): IssueServiceResult<{ issue: Issue }> {
  const existing = findIssueByPublicId(project.id, publicId);
  if (!existing) return fail("Issue not found.");
  if (existing.status === nextStatus) return ok({ issue: existing });
  if (!issueStatuses[existing.status].transitions.includes(nextStatus)) {
    return fail(`${publicId} can't move from ${issueStatuses[existing.status].label} to ${issueStatuses[nextStatus].label}.`);
  }

  const now = new Date().toISOString();
  const updated: Issue = { ...existing, status: nextStatus, updatedAt: now };
  saveIssue(updated);

  activity(project.id, actorType, actorName, `moved ${updated.publicId} to ${issueStatuses[nextStatus].label}`, updated.id);

  return ok({ issue: updated });
}

/**
 * Records (or revises) the fix note and lands the issue on `fixInProgress` —
 * available once investigation has started (`investigating`, already
 * `fixInProgress`, or `reopened`), never directly from `open` (the
 * "Start investigating" action is the deliberate first step).
 */
export function recordIssueFix(
  project: Project,
  publicId: string,
  fixNote: string,
  actorName: string,
  actorType: ActivityEvent["actorType"] = "human",
): IssueServiceResult<{ issue: Issue }> {
  const existing = findIssueByPublicId(project.id, publicId);
  if (!existing) return fail("Issue not found.");
  if (existing.status !== "investigating" && existing.status !== "fixInProgress" && existing.status !== "reopened") {
    return fail(`${publicId} must be Investigating (or Reopened) before recording a fix.`);
  }

  const now = new Date().toISOString();
  const updated: Issue = { ...existing, fixNote: fixNote.trim(), status: "fixInProgress", updatedAt: now };
  saveIssue(updated);

  activity(project.id, actorType, actorName, `recorded a fix for ${updated.publicId}`, updated.id, {
    metadata: { fixNote: updated.fixNote },
  });

  return ok({ issue: updated });
}

export function markIssueReadyForRetest(
  project: Project,
  publicId: string,
  actorName: string,
): IssueServiceResult<{ issue: Issue }> {
  const existing = findIssueByPublicId(project.id, publicId);
  if (!existing) return fail("Issue not found.");
  if (existing.status === "readyForRetest") return ok({ issue: existing });
  if (existing.status !== "fixInProgress") {
    return fail(`${publicId} needs a recorded fix before it can be marked ready for retest.`);
  }
  if (!existing.fixNote) {
    return fail("Record what the fix was before marking this ready for retest.");
  }

  const now = new Date().toISOString();
  // Clears any rerun from an earlier cycle — a fresh cycle starts with no
  // applicable rerun until "Create focused rerun" runs again.
  const updated: Issue = { ...existing, status: "readyForRetest", rerunTestRunId: undefined, updatedAt: now };
  saveIssue(updated);

  activity(project.id, "human", actorName, `marked ${updated.publicId} ready for retest`, updated.id);

  return ok({ issue: updated });
}

// ---- Focused rerun ----

export type CreateFocusedRerunInput = {
  build: string;
  environment: string;
  browser: string;
  assigneeName?: string;
};

export type CreateFocusedRerunOutcome = { testRun: TestRun; issues: Issue[]; project: Project };

/**
 * Creates one rerun `TestRun` scoped to exactly the origin test cases of the
 * selected ready-for-retest issues (de-duplicated, since two issues can
 * share an origin case) and points each issue at it as the rerun to watch
 * (Phase 7 Build: "Focused rerun creation from affected tests"). Issues that
 * aren't `readyForRetest` are silently skipped rather than failing the whole
 * batch, so a mixed bulk selection still runs for the eligible ones.
 */
export function createFocusedRerun(
  project: Project,
  issuePublicIdsInScope: readonly string[],
  input: CreateFocusedRerunInput,
  actorName: string,
): IssueServiceResult<CreateFocusedRerunOutcome> {
  const eligible: { issue: Issue; testCase: TestCase }[] = [];
  for (const publicId of issuePublicIdsInScope) {
    const issue = findIssueByPublicId(project.id, publicId);
    if (!issue || issue.status !== "readyForRetest") continue;
    const testCase = findTestCaseById(project.id, issue.testCaseId);
    if (!testCase) continue;
    eligible.push({ issue, testCase });
  }
  if (eligible.length === 0) {
    return fail("Select at least one issue that's ready for retest.");
  }

  const testCaseIds = Array.from(new Set(eligible.map((e) => e.testCase.publicId)));
  const issueLabel = eligible.length === 1 ? eligible[0].issue.publicId : `${eligible.length} issues`;

  const runResult = createTestRun(
    project,
    {
      name: `Focused rerun — ${issueLabel}`,
      build: input.build,
      environment: input.environment,
      browser: input.browser,
      assigneeName: input.assigneeName,
      testCaseIds,
      publicIdPrefix: "RERUN",
    },
    actorName,
  );
  if (!runResult.ok) return fail(runResult.error);

  const now = new Date().toISOString();
  const updatedIssues: Issue[] = [];
  for (const { issue } of eligible) {
    const updated: Issue = { ...issue, rerunTestRunId: runResult.data.testRun.id, updatedAt: now };
    saveIssue(updated);
    updatedIssues.push(updated);

    activity(
      project.id,
      "human",
      actorName,
      `created a focused rerun (${runResult.data.testRun.publicId}) for ${issue.publicId}`,
      issue.id,
      { relatedEntities: [{ type: "testRun", id: runResult.data.testRun.id }] },
    );
  }

  return ok({ testRun: runResult.data.testRun, issues: updatedIssues, project: runResult.data.project });
}

// ---- Verify / reopen — the hard business rule ----

function verifyIssueFromPassedRerun(project: Project, issue: Issue, result: TestResult): Issue {
  const now = new Date().toISOString();
  const updated: Issue = {
    ...issue,
    status: "verified",
    rerunResultId: result.id,
    rerunTestRunId: undefined,
    updatedAt: now,
  };
  saveIssue(updated);
  activity(project.id, "system", "Veriqo", `verified ${updated.publicId} from a passed rerun`, updated.id, {
    relatedEntities: [{ type: "testResult", id: result.id }],
  });
  return updated;
}

function reopenIssueFromFailedRerun(project: Project, issue: Issue, result: TestResult): Issue {
  const now = new Date().toISOString();
  const updated: Issue = {
    ...issue,
    status: "reopened",
    rerunResultId: result.id,
    rerunTestRunId: undefined,
    updatedAt: now,
  };
  saveIssue(updated);
  activity(
    project.id,
    "system",
    "Veriqo",
    `reopened ${updated.publicId} — the rerun did not pass`,
    updated.id,
    { relatedEntities: [{ type: "testResult", id: result.id }] },
  );
  return updated;
}

/**
 * The one call site that closes the trust loop: called after a `TestResult`
 * is recorded (`features/test-runs/actions.ts`, `submitTestResultAction`).
 * If that result belongs to a run/case an open issue is tracking as its
 * rerun, this either verifies it (a real pass — the hard business rule) or
 * reopens it (anything else). Not exported from the MCP surface — Claude can
 * investigate and record a fix, but never asserts verification itself.
 */
export function applyRerunResultToIssues(
  project: Project,
  testRun: TestRun,
  testCase: TestCase,
  result: TestResult,
): Issue | null {
  const tracked = repoListIssuesForProject(project.id).find(
    (issue) => issue.status === "readyForRetest" && issue.rerunTestRunId === testRun.id && issue.testCaseId === testCase.id,
  );
  if (!tracked) return null;

  return result.status === "pass"
    ? verifyIssueFromPassedRerun(project, tracked, result)
    : reopenIssueFromFailedRerun(project, tracked, result);
}

/**
 * Public-ID convenience wrapper around `applyRerunResultToIssues` for
 * callers (the runner's result-submission action) that only have the test
 * case's public ID, not the resolved `TestCase` — keeps repository lookups
 * inside the service layer rather than the action.
 */
export function applyRerunResultToIssuesForCase(
  project: Project,
  testRun: TestRun,
  testCasePublicId: string,
  result: TestResult,
): Issue | null {
  const testCase = findTestCaseByPublicId(project.id, testCasePublicId);
  if (!testCase) return null;
  return applyRerunResultToIssues(project, testRun, testCase, result);
}

// ---- Investigation prompt + polling support ----

export function buildIssueInvestigationContext(project: Project, detail: IssueDetail) {
  return {
    project: {
      name: project.name,
      description: project.description,
      appUrl: project.appUrl,
      environment: project.environment,
      repository: project.repository,
    },
    issue: {
      publicId: detail.issue.publicId,
      title: detail.issue.title,
      severity: detail.issue.severity,
      status: detail.issue.status,
    },
    feature: detail.feature ? { publicId: detail.feature.publicId, name: detail.feature.name } : null,
    testCase: detail.testCase
      ? {
          publicId: detail.testCase.publicId,
          title: detail.testCase.title,
          steps: detail.testCase.steps,
          expectedResult: detail.testCase.expectedResult,
        }
      : null,
    originResult: detail.originResult
      ? {
          actualResult: detail.originResult.actualResult ?? null,
          evidenceCount: detail.originResult.evidence.length,
          build: detail.originTestRun?.build ?? null,
          environment: detail.originTestRun?.environment ?? null,
          browser: detail.originTestRun?.browser ?? null,
        }
      : null,
  };
}

export function renderIssueInvestigationPrompt(project: Project, detail: IssueDetail): string {
  return issueInvestigationPrompt.render(buildIssueInvestigationContext(project, detail));
}

export type IssueActivitySince = { events: ActivityEvent[] };

/**
 * Takes the issue's public ID, not its internal `id` — the client polling
 * this only ever knows the public ID (04-CONFIG-BLUEPRINT.md, "Public IDs");
 * resolving it here keeps the internal ID out of the action/client layer.
 */
export function getIssueActivitySince(project: Project, publicId: string, sinceIso: string): IssueActivitySince {
  const issue = findIssueByPublicId(project.id, publicId);
  if (!issue) return { events: [] };

  const since = new Date(sinceIso).getTime();
  const events = listActivityForProject(project.id)
    .filter(
      (event) =>
        (event.entityType === "issue" || event.entityType === "testResult") &&
        (event.entityId === issue.id || event.relatedEntities?.some((r) => r.type === "issue" && r.id === issue.id)) &&
        new Date(event.createdAt).getTime() > since,
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30);

  return { events };
}
