"use server";

import { redirect } from "next/navigation";

import { fieldErrorsFromZod, formErrorState, type ActionState } from "@/lib/forms/action-state";
import { createProjectSchema } from "@/features/projects/schemas";
import { getCurrentUser } from "@/server/services/auth-service";
import { createProjectForOwner } from "@/server/services/project-service";

export type CreateProjectValues = {
  name: string;
  description: string;
  appUrl: string;
  environment: string;
  repository: string;
};

export async function createProjectAction(
  _prevState: ActionState<CreateProjectValues>,
  formData: FormData,
): Promise<ActionState<CreateProjectValues>> {
  const values: CreateProjectValues = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    appUrl: String(formData.get("appUrl") ?? ""),
    environment: String(formData.get("environment") ?? ""),
    repository: String(formData.get("repository") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);

  const parsed = createProjectSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const project = await createProjectForOwner(
    {
      name: parsed.data.name,
      description: parsed.data.description,
      appUrl: parsed.data.appUrl,
      environment: parsed.data.environment,
      repository: parsed.data.repository || undefined,
    },
    user,
  );

  redirect(`/projects/${project.slug}`);
}

export type UpdateProjectValues = CreateProjectValues & { slug: string };

export async function updateProjectAction(
  _prevState: ActionState<UpdateProjectValues>,
  formData: FormData,
): Promise<ActionState<UpdateProjectValues>> {
  const slug = String(formData.get("slug") ?? "");
  const values: UpdateProjectValues = {
    slug,
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    appUrl: String(formData.get("appUrl") ?? ""),
    environment: String(formData.get("environment") ?? ""),
    repository: String(formData.get("repository") ?? ""),
  };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);

  const parsed = createProjectSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const { updateProjectForOwner } = await import("@/server/services/project-service");
  const updated = await updateProjectForOwner(
    slug,
    {
      name: parsed.data.name,
      description: parsed.data.description,
      appUrl: parsed.data.appUrl,
      environment: parsed.data.environment,
      repository: parsed.data.repository || undefined,
    },
    user,
  );

  if (!updated) {
    return formErrorState("Project could not be updated or does not exist.", values);
  }

  const { successState } = await import("@/lib/forms/action-state");
  return successState(values);
}

export async function toggleProjectArchivedAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { toggleProjectArchivedForOwner } = await import("@/server/services/project-service");
  const updated = await toggleProjectArchivedForOwner(slug, user);
  if (!updated) redirect("/projects");

  redirect(`/projects/${slug}/settings`);
}

