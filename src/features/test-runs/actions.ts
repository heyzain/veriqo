"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCommaIds, submitTestResultSchema, testRunCreateFormSchema } from "@/features/test-runs/schemas";
import { fieldErrorsFromZod, formErrorState, successState, type ActionState } from "@/lib/forms/action-state";
import { getCurrentUser } from "@/server/services/auth-service";
import { applyRerunResultToIssuesForCase } from "@/server/services/issue-service";
import { getProjectForOwner } from "@/server/services/project-service";
import {
  approveClaudeResult,
  createTestRun,
  getTestRunActivitySince,
  getTestRunDetail,
  pauseTestRun,
  rejectClaudeResult,
  startTestRun,
  submitTestResult,
  type RunProgress,
  type TestRunActivitySince,
} from "@/server/services/test-run-service";
import type { TestEvidence, TestRun } from "@/types/domain";

async function requireProject(projectSlug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const project = await getProjectForOwner(projectSlug, user);
  if (!project) redirect("/projects");
  return { user, project };
}

// ---- Create run ----

export type CreateTestRunValues = {
  name: string;
  build: string;
  environment: string;
  browser: string;
  assigneeName: string;
  notes: string;
  testCaseIds: string;
  executionMode: string;
};

export async function createTestRunAction(
  _prevState: ActionState<CreateTestRunValues>,
  formData: FormData,
): Promise<ActionState<CreateTestRunValues>> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const values: CreateTestRunValues = {
    name: String(formData.get("name") ?? ""),
    build: String(formData.get("build") ?? ""),
    environment: String(formData.get("environment") ?? ""),
    browser: String(formData.get("browser") ?? ""),
    assigneeName: String(formData.get("assigneeName") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    testCaseIds: String(formData.get("testCaseIds") ?? ""),
    executionMode: String(formData.get("executionMode") ?? "manual"),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = await getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const parsed = testRunCreateFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = await createTestRun(
    project,
    {
      name: parsed.data.name,
      build: parsed.data.build,
      environment: parsed.data.environment,
      browser: parsed.data.browser,
      assigneeName: parsed.data.assigneeName,
      notes: parsed.data.notes,
      testCaseIds: parseCommaIds(parsed.data.testCaseIds),
      executionMode: parsed.data.executionMode,
    },
    user.name,
  );

  if (!result.ok) return formErrorState(result.error, values);
  redirect(`/projects/${projectSlug}/test-runs/${result.data.testRun.publicId}`);
}

// ---- Lifecycle ----

export async function startTestRunAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await startTestRun(project, runId, user.name);
  redirect(`/projects/${projectSlug}/test-runs/${runId}/run`);
}

export async function pauseTestRunAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await pauseTestRun(project, runId, user.name);
  redirect(redirectTo.startsWith("/") ? redirectTo : `/projects/${projectSlug}/test-runs/${runId}`);
}

// ---- Recording a result from the focused runner ----
// Called directly from a client component (not bound to a <form>), the same
// way pollTestCaseGenerationActivityAction is in Phase 5 — the runner needs
// the fresh run/progress back to decide what to render next.

export type SubmitTestResultActionInput = {
  projectSlug: string;
  runId: string;
  testCaseId: string;
  status: "pass" | "fail" | "partial" | "blocked";
  actualResult?: string;
  evidence?: TestEvidence[];
};

export type SubmitTestResultActionResult =
  | { ok: true; testRun: TestRun; progress: RunProgress; issueUpdate: { publicId: string; status: string } | null }
  | { ok: false; error: string };

export async function submitTestResultAction(
  input: SubmitTestResultActionInput,
): Promise<SubmitTestResultActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const project = await getProjectForOwner(input.projectSlug, user);
  if (!project) return { ok: false, error: "Project could not be found." };

  const parsed = submitTestResultSchema.safeParse({
    status: input.status,
    actualResult: input.actualResult,
    evidence: input.evidence ?? [],
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Couldn't record this result." };
  }

  const result = await submitTestResult(
    project,
    input.runId,
    input.testCaseId,
    { status: parsed.data.status, actualResult: parsed.data.actualResult, evidence: parsed.data.evidence },
    user.name,
  );
  if (!result.ok) return { ok: false, error: result.error };

  // Hard business rule (03-CLAUDE-RULES.md): a fix does not verify an issue —
  // only an applicable passed rerun can. This is the one place a recorded
  // result can close (or reopen) an issue's retest cycle.
  const updatedIssue = await applyRerunResultToIssuesForCase(project, result.data.testRun, input.testCaseId, result.data.result);
  if (updatedIssue) revalidatePath(`/projects/${input.projectSlug}/issues/${updatedIssue.publicId}`);

  revalidatePath(`/projects/${input.projectSlug}/test-runs/${input.runId}`);
  revalidatePath(`/projects/${input.projectSlug}/test-runs`);

  const detail = await getTestRunDetail(project, input.runId);
  return {
    ok: true,
    testRun: result.data.testRun,
    progress: detail?.progress ?? { total: 0, notRun: 0, pass: 0, fail: 0, partial: 0, blocked: 0 },
    issueUpdate: updatedIssue ? { publicId: updatedIssue.publicId, status: updatedIssue.status } : null,
  };
}

// ---- Human review of a Claude-submitted result (Phase 8) ----

export async function approveClaudeResultAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await approveClaudeResult(project, runId, testCaseId, user.name);
  redirect(`/projects/${projectSlug}/test-runs/${runId}`);
}

export async function rejectClaudeResultAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await rejectClaudeResult(project, runId, testCaseId, user.name);
  redirect(`/projects/${projectSlug}/test-runs/${runId}`);
}

export type CorrectTestResultValues = { status: string; actualResult: string };

/**
 * A human's Correct action — deliberately just `submitTestResult` again with
 * `actorType: "human"` (the default): the human becomes the result's current
 * author, the same as any other re-submission. See `submitTestResult`'s doc
 * comment.
 */
export async function correctTestResultAction(
  _prevState: ActionState<CorrectTestResultValues>,
  formData: FormData,
): Promise<ActionState<CorrectTestResultValues>> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const values: CorrectTestResultValues = {
    status: String(formData.get("status") ?? ""),
    actualResult: String(formData.get("actualResult") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = await getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const parsed = submitTestResultSchema.safeParse({ status: values.status, actualResult: values.actualResult, evidence: [] });
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = await submitTestResult(
    project,
    runId,
    testCaseId,
    { status: parsed.data.status, actualResult: parsed.data.actualResult },
    user.name,
  );
  if (!result.ok) return formErrorState(result.error, values);

  const updatedIssue = await applyRerunResultToIssuesForCase(project, result.data.testRun, testCaseId, result.data.result);
  if (updatedIssue) revalidatePath(`/projects/${projectSlug}/issues/${updatedIssue.publicId}`);
  revalidatePath(`/projects/${projectSlug}/test-runs/${runId}`);

  return successState(values);
}

/**
 * Read-only poll backing the Claude-assisted execution panel's "waiting for
 * Claude" states — mirrors `pollFeatureDiscoveryActivityAction`.
 */
export async function pollTestRunActivityAction(
  projectSlug: string,
  runPublicId: string,
  sinceIso: string,
): Promise<TestRunActivitySince | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await getProjectForOwner(projectSlug, user);
  if (!project) return null;
  return getTestRunActivitySince(project, runPublicId, sinceIso);
}
