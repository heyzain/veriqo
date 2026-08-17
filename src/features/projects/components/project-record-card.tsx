import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { nextSetupStepLabel, totalSetupSteps } from "@/config/setup-steps.config";
import { formatDate } from "@/lib/format/date";
import { projectEnvironmentLabel } from "@/lib/format/project-environment";
import type { ActivityEvent, Project } from "@/types/domain";

/**
 * `ProjectRecordCard` (01-DESIGN-SYSTEM.md component list). Shows setup
 * state, next action, and last activity — real derived facts, not a
 * fabricated health score (that's the release-confidence engine in
 * Phase 9). "Open project" is a distinct link from the title, so the row
 * itself isn't one giant click target (03-CLAUDE-RULES.md, "Tables and
 * record lists").
 */
export function ProjectRecordCard({
  project,
  lastActivity,
}: {
  project: Project;
  lastActivity?: ActivityEvent;
}) {
  const nextStep = nextSetupStepLabel(project.setupStepsCompleted);
  const isSetUp = project.setupStepsCompleted >= totalSetupSteps;

  return (
    <article className="flex flex-col gap-4 rounded-md border border-subtle bg-surface px-5 py-5 transition-fast hover:border-strong sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/projects/${project.slug}`}
            className="text-title-md text-foreground underline-offset-4 hover:underline"
          >
            {project.name}
          </Link>
          <span className="text-mono-sm text-foreground-muted">{project.publicId}</span>
          {project.archived ? <Badge tone="blocked" icon="archived">Archived</Badge> : null}
        </div>

        <p className="max-w-2xl text-body-sm text-foreground-secondary">{project.description}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-body-sm text-foreground-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="settings" size={14} />
            {projectEnvironmentLabel[project.environment]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name={isSetUp ? "approved" : "inProgress"} size={14} />
            {isSetUp
              ? `Set up — ${totalSetupSteps}/${totalSetupSteps} steps`
              : `Setup ${project.setupStepsCompleted}/${totalSetupSteps} — next: ${nextStep}`}
          </span>
          {lastActivity ? (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="activity" size={14} />
              {lastActivity.actorName} {lastActivity.action} · {formatDate(lastActivity.createdAt)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="activity" size={14} />
              No activity yet
            </span>
          )}
        </div>
      </div>

      <Link
        href={`/projects/${project.slug}`}
        className="inline-flex shrink-0 items-center gap-1.5 self-start text-body-sm font-medium text-action underline-offset-4 hover:underline sm:self-center"
      >
        Open project
        <Icon name="chevronRight" size={14} />
      </Link>
    </article>
  );
}
