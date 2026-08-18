import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { pauseTestRunAction, startTestRunAction } from "@/features/test-runs/actions";
import type { TestRun } from "@/types/domain";

export type RunLifecycleActionsProps = {
  projectSlug: string;
  testRun: TestRun;
  /** "list" links a finished run to its detail page; "detail" is already there, so it shows nothing extra. */
  context: "list" | "detail";
  /** Where "Pause" returns to — defaults to the run detail page. */
  redirectTo?: string;
  size?: "sm" | "md";
};

/**
 * The Start/Resume/Continue+Pause/View-results button set, shared by the run
 * list row and the run detail header so the lifecycle only has one
 * implementation (03-CLAUDE-RULES.md, "No duplicated status maps in
 * multiple files" — the same discipline applied to the actions that follow
 * from a status).
 */
export function RunLifecycleActions({ projectSlug, testRun, context, redirectTo, size = "sm" }: RunLifecycleActionsProps) {
  const runnerHref = `/projects/${projectSlug}/test-runs/${testRun.publicId}/run`;

  if (testRun.status === "planned") {
    return (
      <form action={startTestRunAction}>
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="runId" value={testRun.publicId} />
        <Button type="submit" intent="primary" size={size}>
          <Icon name="testRuns" size={14} />
          <span>Start run</span>
        </Button>
      </form>
    );
  }

  if (testRun.status === "paused") {
    return (
      <form action={startTestRunAction}>
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="runId" value={testRun.publicId} />
        <Button type="submit" intent="primary" size={size}>
          <Icon name="testRuns" size={14} />
          <span>Resume</span>
        </Button>
      </form>
    );
  }

  if (testRun.status === "inProgress") {
    return (
      <div className="flex items-center gap-2">
        <Button asChild intent="primary" size={size}>
          <Link href={runnerHref}>
            <Icon name="testRuns" size={14} />
            <span>Continue</span>
          </Link>
        </Button>
        <form action={pauseTestRunAction}>
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="runId" value={testRun.publicId} />
          {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
          <Button type="submit" intent="secondary" size={size}>
            <Icon name="paused" size={14} />
            <span>Pause</span>
          </Button>
        </form>
      </div>
    );
  }

  if (context === "detail") return null;

  return (
    <Button asChild intent="secondary" size={size}>
      <Link href={`/projects/${projectSlug}/test-runs/${testRun.publicId}`}>
        <span>View results</span>
        <Icon name="chevronRight" size={14} />
      </Link>
    </Button>
  );
}
