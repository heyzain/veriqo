import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectRecordCard } from "@/features/projects/components/project-record-card";
import { ProjectsToolbar } from "@/features/projects/components/projects-toolbar";
import { getCurrentUser } from "@/server/services/auth-service";
import { getLastActivityForProject, listProjects } from "@/server/services/project-service";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { q = "", view: rawView } = await searchParams;
  const view = rawView === "archived" ? "archived" : "active";

  const { active, archived } = await listProjects(user);
  const totalOwned = active.length + archived.length;
  const scoped = view === "archived" ? archived : active;
  const query = q.trim().toLowerCase();
  const visible = query
    ? scoped.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query),
      )
    : scoped;
  const lastActivityByProjectId = new Map(
    await Promise.all(
      visible.map(async (project) => [project.id, await getLastActivityForProject(project.id)] as const),
    ),
  );

  return (
    <div className="mx-auto flex max-w-[1480px] flex-col gap-8 px-6 py-10 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="text-eyebrow-style text-foreground-muted">Workspace</p>
          <h1 className="font-serif text-display-md text-foreground">Projects</h1>
          <p className="text-body-lg text-foreground-secondary">
            Each project keeps its own features, tests, runs, and issues — connect Claude once
            you&apos;re inside one.
          </p>
        </div>
        <Button asChild size="lg" className="self-start sm:self-auto">
          <Link href="/projects/new">
            <span aria-hidden="true">+</span> Create project
          </Link>
        </Button>
      </div>

      {totalOwned === 0 ? (
        <EmptyState
          icon="projects"
          title="Create your first project"
          description="Add its application URL, a short description, and where the code lives. Claude connects to it next."
          action={
            <Button asChild>
              <Link href="/projects/new">Create your first project</Link>
            </Button>
          }
          className="mt-8"
        />
      ) : (
        <div className="flex flex-col gap-5">
          <ProjectsToolbar query={q} view={view} archivedCount={archived.length} />

          {visible.length === 0 ? (
            <EmptyState
              icon="search"
              title={query ? "No projects match your search" : "No archived projects"}
              description={
                query
                  ? "Try a different name or description."
                  : "Projects you archive will show up here."
              }
              action={
                query ? (
                  <Button asChild intent="secondary">
                    <Link href={`?view=${view}`}>Clear search</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((project) => (
                <ProjectRecordCard
                  key={project.id}
                  project={project}
                  lastActivity={lastActivityByProjectId.get(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
