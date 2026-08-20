import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { SetupStep } from "@/config/setup-steps.config";

export type SetupStepItemProps = {
  step: SetupStep;
  currentCompletedSteps: number;
  projectSlug: string;
};

export function getStepDestination(stepNumber: number, projectSlug: string): {
  href: string;
  actionLabel: string;
  description: string;
} {
  switch (stepNumber) {
    case 1:
      return {
        href: `/projects/${projectSlug}/settings`,
        actionLabel: "View settings",
        description: "Project workspace, environment, and repository context are configured.",
      };
    case 2:
      return {
        href: `/projects/${projectSlug}/mcp`,
        actionLabel: "Connect Claude MCP",
        description: "Set up the Claude Code MCP connection with project-specific credentials.",
      };
    case 3:
      return {
        href: `/projects/${projectSlug}/features`,
        actionLabel: "Discover features",
        description: "Prompt Claude to inspect the codebase and identify structured features.",
      };
    case 4:
      return {
        href: `/projects/${projectSlug}/features`,
        actionLabel: "Review features",
        description: "Review, edit, and approve discovered features with risk classifications.",
      };
    case 5:
      return {
        href: `/projects/${projectSlug}/test-cases`,
        actionLabel: "Generate test cases",
        description: "Generate structured test cases covering approved features.",
      };
    case 6:
      return {
        href: `/projects/${projectSlug}/test-runs`,
        actionLabel: "Create test run",
        description: "Run test cases against a release candidate build and record results.",
      };
    case 7:
    default:
      return {
        href: `/projects/${projectSlug}`,
        actionLabel: "Review readiness",
        description: "Verify fixes via reruns and review the explainable release readiness.",
      };
  }
}

import { completeSetupStepAction } from "@/features/projects/actions";

export function SetupStepItem({
  step,
  currentCompletedSteps,
  projectSlug,
}: SetupStepItemProps) {
  const isCompleted = step.step <= currentCompletedSteps;
  const isNextAction = step.step === currentCompletedSteps + 1;

  const { href, actionLabel, description } = getStepDestination(step.step, projectSlug);

  return (
    <div
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border p-4 transition-fast ${
        isNextAction
          ? "border-strong bg-surface shadow-sm ring-1 ring-focus-ring"
          : isCompleted
            ? "border-subtle bg-surface/60 opacity-90 hover:opacity-100"
            : "border-subtle bg-inset/40 opacity-70"
      }`}
    >
      <div className="flex items-start gap-3.5 min-w-0">
        {/* Step Indicator Badge */}
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-body-sm font-medium transition-fast ${
            isCompleted
              ? "bg-pass/15 text-pass border border-pass/30"
              : isNextAction
                ? "bg-forest text-foreground-on-dark font-semibold shadow-sm"
                : "bg-paper-2 text-foreground-muted border border-subtle"
          }`}
        >
          {isCompleted ? <Icon name="check" size={14} /> : step.step}
        </div>

        {/* Step Content */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-body font-medium ${
                isNextAction
                  ? "text-foreground font-semibold"
                  : isCompleted
                    ? "text-foreground"
                    : "text-foreground-secondary"
              }`}
            >
              {step.label}
            </span>
            {isNextAction && (
              <Badge tone="progress" icon="inProgress">
                Next action
              </Badge>
            )}
            {isCompleted && (
              <Badge tone="pass" icon="approved">
                Complete
              </Badge>
            )}
          </div>
          <p className="text-body-sm text-foreground-muted">{description}</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {isNextAction ? (
          step.step === 7 ? (
            <form action={completeSetupStepAction}>
              <input type="hidden" name="slug" value={projectSlug} />
              <input type="hidden" name="step" value="7" />
              <Button type="submit" intent="primary" size="sm">
                <span>{actionLabel}</span>
                <Icon name="chevronRight" size={14} />
              </Button>
            </form>
          ) : (
            <Button asChild intent="primary" size="sm">
              <Link href={href}>
                <span>{actionLabel}</span>
                <Icon name="chevronRight" size={14} />
              </Link>
            </Button>
          )
        ) : (
          <Button asChild intent="ghost" size="sm">
            <Link href={href} className="text-foreground-muted hover:text-foreground">
              <span>View</span>
              <Icon name="chevronRight" size={12} />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
