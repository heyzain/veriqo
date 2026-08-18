"use server";

import { redirect } from "next/navigation";

import {
  focusedRerunFormSchema,
  issueCreateFormSchema,
  issueFixFormSchema,
  parseCommaIds,
} from "@/features/issues/schemas";
import { fieldErrorsFromZod, formErrorState, successState, type ActionState } from "@/lib/forms/action-state";
import { getCurrentUser } from "@/server/services/auth-service";
import {
  createFocusedRerun,
  createIssueFromFailedResult,
  getIssueActivitySince,
  markIssueReadyForRetest,
  recordIssueFix,
  updateIssueStatus,
  type IssueActivitySince,
} from "@/server/services/issue-service";
import { getProjectForOwner } from "@/server/services/project-service";
import type { IssueStatus } from "@/config/status.config";

async function requireProject(projectSlug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const project = getProjectForOwner(projectSlug, user);
  if (!project) redirect("/projects");
  return { user, project };
}

// ---- Create from a failed result ----

export type CreateIssueValues = { title: string; severity: string };

export async function createIssueAction(
  _prevState: ActionState<CreateIssueValues>,
  formData: FormData,
): Promise<ActionState<CreateIssueValues>> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const testRunId = String(formData.get("testRunId") ?? "");
  const testCaseId = String(formData.get("testCaseId") ?? "");
  const values: CreateIssueValues = {
    title: String(formData.get("title") ?? ""),
    severity: String(formData.get("severity") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const parsed = issueCreateFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = createIssueFromFailedResult(project, testRunId, testCaseId, parsed.data, user.name);
  if (!result.ok) return formErrorState(result.error, values);

  redirect(`/projects/${projectSlug}/issues/${result.data.issue.publicId}`);
}

// ---- Manual lifecycle ----

export async function updateIssueStatusAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const issueId = String(formData.get("issueId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") as IssueStatus;
  const { user, project } = await requireProject(projectSlug);

  if (nextStatus === "open" || nextStatus === "investigating" || nextStatus === "fixInProgress") {
    updateIssueStatus(project, issueId, nextStatus, user.name);
  }
  redirect(`/projects/${projectSlug}/issues/${issueId}`);
}

export async function markIssueReadyForRetestAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const issueId = String(formData.get("issueId") ?? "");
  const { user, project } = await requireProject(projectSlug);

  markIssueReadyForRetest(project, issueId, user.name);
  redirect(`/projects/${projectSlug}/issues/${issueId}`);
}

export type RecordIssueFixValues = { fixNote: string };

export async function recordIssueFixAction(
  _prevState: ActionState<RecordIssueFixValues>,
  formData: FormData,
): Promise<ActionState<RecordIssueFixValues>> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const issueId = String(formData.get("issueId") ?? "");
  const values: RecordIssueFixValues = { fixNote: String(formData.get("fixNote") ?? "") };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const parsed = issueFixFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = recordIssueFix(project, issueId, parsed.data.fixNote, user.name);
  if (!result.ok) return formErrorState(result.error, values);

  return successState({ fixNote: result.data.issue.fixNote ?? "" });
}

// ---- Focused rerun ----

export type CreateFocusedRerunValues = {
  build: string;
  environment: string;
  browser: string;
  assigneeName: string;
  issueIds: string;
};

export async function createFocusedRerunAction(
  _prevState: ActionState<CreateFocusedRerunValues>,
  formData: FormData,
): Promise<ActionState<CreateFocusedRerunValues>> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const values: CreateFocusedRerunValues = {
    build: String(formData.get("build") ?? ""),
    environment: String(formData.get("environment") ?? ""),
    browser: String(formData.get("browser") ?? ""),
    assigneeName: String(formData.get("assigneeName") ?? ""),
    issueIds: String(formData.get("issueIds") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const parsed = focusedRerunFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = createFocusedRerun(
    project,
    parseCommaIds(parsed.data.issueIds),
    {
      build: parsed.data.build,
      environment: parsed.data.environment,
      browser: parsed.data.browser,
      assigneeName: parsed.data.assigneeName,
    },
    user.name,
  );
  if (!result.ok) return formErrorState(result.error, values);

  redirect(`/projects/${projectSlug}/test-runs/${result.data.testRun.publicId}`);
}

/**
 * Read-only poll backing the investigation panel's "waiting for Claude"
 * states — called directly from a client component, not bound to a
 * `<form>`. Mirrors `pollFeatureDiscoveryActivityAction`.
 */
export async function pollIssueActivityAction(
  projectSlug: string,
  issuePublicId: string,
  sinceIso: string,
): Promise<IssueActivitySince | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return null;
  return getIssueActivitySince(project, issuePublicId, sinceIso);
}
