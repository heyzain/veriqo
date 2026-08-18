"use server";

import { redirect } from "next/navigation";

import {
  featureEditFormSchema,
  parseAcceptanceCriteriaText,
  parseCommaList,
} from "@/features/features/schemas";
import { fieldErrorsFromZod, formErrorState, successState, type ActionState } from "@/lib/forms/action-state";
import { getCurrentUser } from "@/server/services/auth-service";
import {
  approveFeature,
  archiveFeature,
  bulkApproveFeatures,
  bulkArchiveFeatures,
  editFeature,
  getFeatureDiscoveryActivitySince,
  logFeatureRegenerationRequested,
  mergeFeatures,
  restoreFeature,
  type FeatureDiscoveryActivitySince,
} from "@/server/services/feature-service";
import { getProjectForOwner } from "@/server/services/project-service";

/** Only ever redirects to a same-app path — a stray absolute URL in `redirectTo` is ignored. */
function safeRedirectTarget(target: string, fallback: string): string {
  return target.startsWith("/") && !target.startsWith("//") ? target : fallback;
}

async function requireProject(projectSlug: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const project = getProjectForOwner(projectSlug, user);
  if (!project) redirect("/projects");
  return { user, project };
}

export async function approveFeatureAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const featureId = String(formData.get("featureId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  approveFeature(project, featureId, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/features`));
}

export async function archiveFeatureAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const featureId = String(formData.get("featureId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  archiveFeature(project, featureId, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/features`));
}

export async function restoreFeatureAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const featureId = String(formData.get("featureId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  restoreFeature(project, featureId, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/features`));
}

export async function bulkApproveFeaturesAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const featureIds = formData.getAll("featureId").map(String);
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  bulkApproveFeatures(project, featureIds, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/features`));
}

export async function bulkArchiveFeaturesAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const featureIds = formData.getAll("featureId").map(String);
  const redirectTo = String(formData.get("redirectTo") ?? "");
  const { user, project } = await requireProject(projectSlug);

  bulkArchiveFeatures(project, featureIds, user.name);
  redirect(safeRedirectTarget(redirectTo, `/projects/${projectSlug}/features`));
}

/**
 * Called directly from the regenerate dialog while it's open (not a
 * `<form>` submission — nothing should navigate the user away from the
 * dialog they just opened). Purely an audit-trail entry; the actual
 * regeneration happens when Claude calls `update_feature` over MCP.
 */
export async function requestFeatureRegenerationAction(projectSlug: string, featureId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return;

  logFeatureRegenerationRequested(project, featureId, user.name);
}

export type EditFeatureValues = {
  name: string;
  description: string;
  risk: string;
  acceptanceCriteria: string;
  roles: string;
  dependencies: string;
};

export async function editFeatureAction(
  _prevState: ActionState<EditFeatureValues>,
  formData: FormData,
): Promise<ActionState<EditFeatureValues>> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const featureId = String(formData.get("featureId") ?? "");
  const values: EditFeatureValues = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    risk: String(formData.get("risk") ?? ""),
    acceptanceCriteria: String(formData.get("acceptanceCriteria") ?? ""),
    roles: String(formData.get("roles") ?? ""),
    dependencies: String(formData.get("dependencies") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const parsed = featureEditFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = editFeature(
    project,
    featureId,
    {
      name: parsed.data.name,
      description: parsed.data.description,
      risk: parsed.data.risk,
      acceptanceCriteria: parseAcceptanceCriteriaText(parsed.data.acceptanceCriteria),
      roles: parseCommaList(parsed.data.roles),
      dependencies: parseCommaList(parsed.data.dependencies),
    },
    user.name,
  );

  if (!result.ok) return formErrorState(result.error, values);
  return successState(values);
}

export type MergeFeaturesValues = { survivorFeatureId: string; mergedFeatureId: string };

export async function mergeFeaturesAction(
  _prevState: ActionState<MergeFeaturesValues>,
  formData: FormData,
): Promise<ActionState<MergeFeaturesValues>> {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const values: MergeFeaturesValues = {
    survivorFeatureId: String(formData.get("survivorFeatureId") ?? ""),
    mergedFeatureId: String(formData.get("mergedFeatureId") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);
  if (!values.survivorFeatureId || !values.mergedFeatureId) {
    return formErrorState("Choose which feature to keep and which one to merge in.", values);
  }

  const result = mergeFeatures(project, values.survivorFeatureId, values.mergedFeatureId, user.name);
  if (!result.ok) return formErrorState(result.error, values);
  return successState(values);
}

/**
 * Read-only poll backing the "waiting for Claude" discovery panel — called
 * directly from a client component, not bound to a `<form>`. Returns `null`
 * for an expired session or unknown project rather than throwing, since the
 * caller is a background poll, not a user-initiated submission.
 */
export async function pollFeatureDiscoveryActivityAction(
  projectSlug: string,
  sinceIso: string,
): Promise<FeatureDiscoveryActivitySince | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const project = getProjectForOwner(projectSlug, user);
  if (!project) return null;
  return getFeatureDiscoveryActivitySince(project, sinceIso);
}
