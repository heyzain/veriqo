import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectSettingsForm } from "@/features/projects/components/project-settings-form";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectForOwner } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? getProjectForOwner(slug, user) : null;
  return { title: project ? `${project.name} · Settings` : "Project Settings" };
}

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const project = getProjectForOwner(slug, user);
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-subtle pb-6">
        <h1 className="text-title-lg font-serif text-foreground">Project Settings</h1>
        <p className="text-body text-foreground-secondary">
          Manage general configuration, application endpoints, repository link, and archiving.
        </p>
      </div>

      <ProjectSettingsForm project={project} />
    </div>
  );
}
