"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCommaIds, submitTestResultSchema, testRunCreateFormSchema } from "@/features/test-runs/schemas";
import { fieldErrorsFromZod, formErrorState, type ActionState } from "@/lib/forms/action-state";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectForOwner } from "@/server/services/project-service";
import {
  createTestRun,
  getTestRunDetail,
  pauseTestRun,
  startTestRun,
  submitTestResult,
  type RunProgress,
} from "@/server/services/test-run-service";
import type { TestEvidence, TestRun } from "@/types/domain";

async function requireProject(projectSlug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const project = getProjectForOwner(projectSlug, user);
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
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const parsed = testRunCreateFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = createTestRun(
    project,
    {
      name: parsed.data.name,
      build: parsed.data.build,
      environment: parsed.data.environment,
      browser: parsed.data.browser,
      assigneeName: parsed.data.assigneeName,
      notes: parsed.data.notes,
      testCaseIds: parseCommaIds(parsed.data.testCaseIds),
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

  startTestRun(project, runId, user.name);
  redirect(`/projects/${projectSlug}/test-runs/${runId}/run`);
}

export async function pauseTestRunAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const runId = String(formData.get("runId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  pauseTestRun(project, runId, user.name);
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
  | { ok: true; testRun: TestRun; progress: RunProgress }
  | { ok: false; error: string };

export async function submitTestResultAction(
  input: SubmitTestResultActionInput,
): Promise<SubmitTestResultActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session expired. Sign in again." };
  const project = getProjectForOwner(input.projectSlug, user);
  if (!project) return { ok: false, error: "Project could not be found." };

  const parsed = submitTestResultSchema.safeParse({
    status: input.status,
    actualResult: input.actualResult,
    evidence: input.evidence ?? [],
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Couldn't record this result." };
  }

  const result = submitTestResult(
    project,
    input.runId,
    input.testCaseId,
    { status: parsed.data.status, actualResult: parsed.data.actualResult, evidence: parsed.data.evidence },
    user.name,
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/projects/${input.projectSlug}/test-runs/${input.runId}`);
  revalidatePath(`/projects/${input.projectSlug}/test-runs`);

  const detail = getTestRunDetail(project, input.runId);
  return { ok: true, testRun: result.data.testRun, progress: detail?.progress ?? { total: 0, notRun: 0, pass: 0, fail: 0, partial: 0, blocked: 0 } };
}
