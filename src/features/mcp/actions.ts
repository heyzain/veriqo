"use server";

import { redirect } from "next/navigation";

import { checkRateLimit } from "@/lib/auth/rate-limit";
import { formErrorState, successState, type ActionState } from "@/lib/forms/action-state";
import { getCurrentUser } from "@/server/services/auth-service";
import { issueMcpCredential, revokeMcpCredential } from "@/server/services/mcp-service";
import { getProjectForOwner } from "@/server/services/project-service";

/**
 * Backs both "Generate credential" and "Regenerate credential" in
 * `McpCredentialPanel` — the client submits the same action either way,
 * since `issueMcpCredential` already handles "revoke the existing one first
 * if present". Rate-limited per user, separately from the per-project inbound
 * MCP auth rate limit in `mcp-service.handleMcpRequest`
 * (03-CLAUDE-RULES.md, "Rate-limit ... key management ... endpoints").
 */
export type IssueCredentialValues = { projectSlug: string };

export async function issueMcpCredentialAction(
  _prevState: ActionState<IssueCredentialValues>,
  formData: FormData,
): Promise<ActionState<IssueCredentialValues>> {
  const values: IssueCredentialValues = {
    projectSlug: String(formData.get("projectSlug") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);

  const project = await getProjectForOwner(values.projectSlug, user);
  if (!project) return formErrorState("Project could not be found.", values);

  const rateLimit = checkRateLimit(`mcp-key:${user.id}`, { limit: 10, windowMs: 10 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return formErrorState(
      `Too many credential requests. Try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s).`,
      values,
    );
  }

  const { secret } = await issueMcpCredential(project, user.name);

  // The plaintext secret is returned to the client exactly this once, via
  // `meta` — never persisted, logged, or retrievable again after this
  // response (04-CONFIG-BLUEPRINT.md security requirement).
  return successState(values, { secret });
}

export async function revokeMcpCredentialAction(formData: FormData): Promise<void> {
  const projectSlug = String(formData.get("projectSlug") ?? "");

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const project = await getProjectForOwner(projectSlug, user);
  if (!project) redirect("/projects");

  await revokeMcpCredential(project, user.name);
  redirect(`/projects/${projectSlug}/mcp`);
}
