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

  const project = createProjectForOwner(
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
