import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { setupSteps, totalSetupSteps } from "@/config/setup-steps.config";
import { completeSetupStepAction } from "@/features/projects/actions";
import {
  getStepDestination,
  SetupStepItem,
} from "@/features/projects/components/setup-step-item";
import { projectEnvironmentLabel } from "@/lib/format/project-environment";
import type { Project } from "@/types/domain";

export type SetupPathProps = {
  project: Project;
};

export function SetupPath({ project }: SetupPathProps) {
  const completed = project.setupStepsCompleted;
  const nextStepNumber = completed + 1;
  const nextStep = setupSteps.find((s) => s.step === nextStepNumber);
  const nextStepDetails = nextStep ? getStepDestination(nextStep.step, project.slug) : null;
  const progressPercent = Math.round((completed / totalSetupSteps) * 100);

  return (
    <div className="flex flex-col gap-8">
      {/* Top Banner / Next Action Spotlight */}
      {nextStep && nextStepDetails && (
        <div className="flex flex-col gap-4 rounded-lg border border-strong bg-surface p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
                  Current Workflow Stage
                </span>
                <Badge tone="progress" icon="inProgress">
                  Step {nextStep.step} of {totalSetupSteps}
                </Badge>
              </div>
              <h2 className="text-title-lg font-serif text-foreground">
                Next: {nextStep.label}
              </h2>
              <p className="text-body text-foreground-secondary">
                {nextStepDetails.description}
              </p>
            </div>

            <div className="shrink-0">
              {nextStep.step === 7 ? (
                <form action={completeSetupStepAction}>
                  <input type="hidden" name="slug" value={project.slug} />
                  <input type="hidden" name="step" value="7" />
                  <Button type="submit" intent="primary" size="lg" className="w-full sm:w-auto">
                    <Icon name="approved" size={16} />
                    <span>Review readiness</span>
                    <Icon name="chevronRight" size={16} />
                  </Button>
                </form>
              ) : (
                <Button asChild intent="primary" size="lg" className="w-full sm:w-auto">
                  <Link href={nextStepDetails.href}>
                    <Icon name="mcp" size={16} />
                    <span>{nextStepDetails.actionLabel}</span>
                    <Icon name="chevronRight" size={16} />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-subtle">
            <div className="flex items-center justify-between text-body-sm text-foreground-muted">
              <span>Setup Path Progress</span>
              <span className="font-mono">{completed} of {totalSetupSteps} completed ({progressPercent}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-pill bg-paper-2">
              <div
                className="h-full bg-action transition-all duration-300 rounded-pill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Guided Setup Steps List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-title-md text-foreground">Guided Setup Checklist</h3>
          <span className="text-body-sm text-foreground-muted">
            Every step preserves the traceability chain
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {setupSteps.map((step) => (
            <SetupStepItem
              key={step.step}
              step={step}
              currentCompletedSteps={completed}
              projectSlug={project.slug}
            />
          ))}
        </div>
      </div>

      {/* Context Details Grid */}
      <div className="rounded-md border border-subtle bg-surface p-5">
        <h4 className="text-label-style text-foreground-muted uppercase tracking-wider mb-4">
          Project Configuration
        </h4>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-eyebrow text-foreground-muted">Application URL</dt>
            <dd className="text-mono-sm text-foreground truncate">
              <a
                href={project.appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-action"
              >
                {project.appUrl}
              </a>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-eyebrow text-foreground-muted">Environment</dt>
            <dd className="text-body-sm text-foreground">
              {projectEnvironmentLabel[project.environment]}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-eyebrow text-foreground-muted">Repository / Path</dt>
            <dd className="text-mono-sm text-foreground truncate">
              {project.repository ?? "Not configured"}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-eyebrow text-foreground-muted">Project Identifier</dt>
            <dd className="text-mono-sm text-foreground">{project.publicId}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
