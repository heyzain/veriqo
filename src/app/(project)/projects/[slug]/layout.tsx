import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { ProjectShell } from "@/features/projects/components/project-shell";
import { getCurrentUser } from "@/server/services/auth-service";
import {
  getLastActivityForProject,
  getProjectForOwner,
  listProjects,
} from "@/server/services/project-service";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const project = getProjectForOwner(slug, user);
  if (!project) notFound();

  const { active: activeProjects } = listProjects(user);
  const lastActivity = getLastActivityForProject(project.id);

  return (
    <ProjectShell
      project={project}
      projects={activeProjects}
      user={user}
      lastActivity={lastActivity}
    >
      {children}
    </ProjectShell>
  );
}
