import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { nextSetupStepLabel, totalSetupSteps } from "@/config/setup-steps.config";
import { formatDate } from "@/lib/format/date";
import { projectEnvironmentLabel } from "@/lib/format/project-environment";
import { getCurrentUser } from "@/server/services/auth-service";
import { getLastActivityForProject, getProjectForOwner } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? getProjectForOwner(slug, user) : null;
  return { title: project?.name ?? "Project" };
}

/**
 * Honest placeholder, not the Phase 2 project shell. `getProjectForOwner`
 * enforces server-side ownership (03-CLAUDE-RULES.md) — a project that
 * doesn't exist and one that belongs to someone else both 404 identically,
 * so this route can't be used to probe which project slugs exist.
 */
export default async function ProjectPlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const project = getProjectForOwner(slug, user);
  if (!project) notFound();

  const lastActivity = getLastActivityForProject(project.id);
  const nextStep = nextSetupStepLabel(project.setupStepsCompleted);
  const isSetUp = project.setupStepsCompleted >= totalSetupSteps;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10 sm:px-8 sm:py-12">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-body-sm text-foreground-muted hover:text-foreground"
      >
        <Icon name="chevronLeft" size={14} />
        Projects
      </Link>

      <div className="flex flex-col gap-3 border-b border-subtle pb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-title-xl text-foreground">{project.name}</h1>
          <span className="text-mono-sm text-foreground-muted">{project.publicId}</span>
          {project.archived ? <Badge tone="blocked" icon="archived">Archived</Badge> : null}
        </div>
        <p className="max-w-xl text-body-lg text-foreground-secondary">{project.description}</p>
      </div>

      <div className="flex items-start gap-3 rounded-md border border-dashed border-strong bg-inset px-4 py-4">
        <Icon name="info" size={18} className="mt-0.5 shrink-0 text-foreground-muted" />
        <div className="flex flex-col gap-1">
          <p className="text-body text-foreground">
            {project.name} was created. The guided setup path, navigation, and full project
            workspace open in Phase 2.
          </p>
          <p className="text-body-sm text-foreground-muted">
            {isSetUp
              ? `All ${totalSetupSteps} setup steps are complete.`
              : `Next step once Phase 2 lands: ${nextStep}.`}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field label="Application URL" value={project.appUrl} mono />
        <Field label="Environment" value={projectEnvironmentLabel[project.environment]} />
        <Field label="Repository / local path" value={project.repository ?? "Not set"} mono />
        <Field label="Created" value={formatDate(project.createdAt)} />
        <Field
          label="Last activity"
          value={
            lastActivity
              ? `${lastActivity.actorName} ${lastActivity.action} · ${formatDate(lastActivity.createdAt)}`
              : "No activity yet"
          }
        />
      </dl>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-label-style text-foreground-muted">{label}</dt>
      <dd className={mono ? "text-mono-sm text-foreground" : "text-body text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
