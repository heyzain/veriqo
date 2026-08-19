"use server";

import { redirect } from "next/navigation";

import {
  parseCommaList,
  parseStepsText,
  testCaseEditFormSchema,
} from "@/features/test-cases/schemas";
import { fieldErrorsFromZod, formErrorState, successState, type ActionState } from "@/lib/forms/action-state";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectForOwner } from "@/server/services/project-service";
import {
  approveTestCase,
  archiveTestCase,
  bulkApproveTestCases,
  bulkArchiveTestCases,
  duplicateTestCase,
  editTestCase,
  getTestCaseGenerationActivitySince,
  restoreTestCase,
  type TestCaseGenerationActivitySince,
} from "@/server/services/test-case-service";

/** Only ever redirects to a same-app path — a stray absolute URL in `redirectTo` is ignored. */
function safeRedirectTarget(target: string, fallback: string): string {
  return target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}

async function requireProject(projectSlug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const project = await getProjectForOwner(projectSlug, user);
  if (!project) redirect("/projects");
  return { user, project };
}

export async function approveTestCaseAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await approveTestCase(project, testCaseId, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/test-cases`));
}

export async function archiveTestCaseAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await archiveTestCase(project, testCaseId, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/test-cases`));
}

export async function restoreTestCaseAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await restoreTestCase(project, testCaseId, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/test-cases`));
}

export async function duplicateTestCaseAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await duplicateTestCase(project, testCaseId, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/test-cases`));
}

export async function bulkApproveTestCasesAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const testCaseIds = formData.getAll("testCaseId").map(String);
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await bulkApproveTestCases(project, testCaseIds, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/test-cases`));
}

export async function bulkArchiveTestCasesAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const testCaseIds = formData.getAll("testCaseId").map(String);
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  await bulkArchiveTestCases(project, testCaseIds, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/test-cases`));
}

export type EditTestCaseValues = {
  title: string;
  priority: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  roles: string;
  environments: string;
};

export async function editTestCaseAction(
  _prevState: ActionState<EditTestCaseValues>,
  formData: FormData,
): Promise<ActionState<EditTestCaseValues>> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const values: EditTestCaseValues = {
    title: String(formData.get("title") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    preconditions: String(formData.get("preconditions") ?? ""),
    steps: String(formData.get("steps") ?? ""),
    expectedResult: String(formData.get("expectedResult") ?? ""),
    roles: String(formData.get("roles") ?? ""),
    environments: String(formData.get("environments") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = await getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const parsed = testCaseEditFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = await editTestCase(
    project,
    testCaseId,
    {
      title: parsed.data.title,
      priority: parsed.data.priority,
      preconditions: parsed.data.preconditions,
      steps: parseStepsText(parsed.data.steps),
      expectedResult: parsed.data.expectedResult,
      roles: parseCommaList(parsed.data.roles),
      environments: parseCommaList(parsed.data.environments),
    },
    user.name,
  );

  if (!result.ok) return formErrorState(result.error, values);
  return successState(values);
}

/**
 * Read-only poll backing the "waiting for Claude" generation panel — called
 * directly from a client component, not bound to a `<form>`. Returns `null`
 * for an expired session or unknown project rather than throwing, since the
 * caller is a background poll, not a user-initiated submission.
 */
export async function pollTestCaseGenerationActivityAction(
  projectSlug: string,
  sinceIso: string,
): Promise<TestCaseGenerationActivitySince | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await getProjectForOwner(projectSlug, user);
  if (!project) return null;
  return getTestCaseGenerationActivitySince(project, sinceIso);
}
