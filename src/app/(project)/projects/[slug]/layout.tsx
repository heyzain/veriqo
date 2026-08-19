import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { ProjectShell } from "@/features/projects/components/project-shell";
import { getCurrentUser } from "@/server/services/auth-service";
import { getMcpConnectionSnapshot } from "@/server/services/mcp-service";
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
  const project = await getProjectForOwner(slug, user);
  if (!project) notFound();

  const { active: activeProjects } = await listProjects(user);
  const lastActivity = await getLastActivityForProject(project.id);
  const mcpStatus = (await getMcpConnectionSnapshot(project)).status;

  return (
    <ProjectShell
      project={project}
      projects={activeProjects}
      user={user}
      mcpStatus={mcpStatus}
      lastActivity={lastActivity}
    >
      {children}
    </ProjectShell>
  );
}
