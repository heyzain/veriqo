"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createFocusedRerunAction, type CreateFocusedRerunValues } from "@/features/issues/actions";
import { idleState } from "@/lib/forms/action-state";
import type { ProjectEnvironment } from "@/types/domain";

const environmentOptions = [
  { value: "Development", label: "Development" },
  { value: "Staging", label: "Staging" },
  { value: "Production", label: "Production" },
] as const;

const environmentLabel: Record<ProjectEnvironment, string> = {
  development: "Development",
  staging: "Staging",
  production: "Production",
};

export type CreateFocusedRerunFormProps = {
  projectSlug: string;
  projectEnvironment: ProjectEnvironment;
  issuePublicIds: readonly string[];
  /** Pre-fill build/browser from the original failing run — the obvious next build to retest against. */
  defaultBuild?: string;
  defaultBrowser?: string;
};

/**
 * "Focused rerun creation from affected tests" (Phase 7 Build) — scoped to
 * exactly the origin test cases of the selected ready-for-retest issues.
 * Reuses the run-creation service under the hood (`test-run-service`), so a
 * rerun is a real, executable `TestRun` with its own progress and evidence,
 * not a special-cased shadow record.
 */
export function CreateFocusedRerunForm({
  projectSlug,
  projectEnvironment,
  issuePublicIds,
  defaultBuild,
  defaultBrowser,
}: CreateFocusedRerunFormProps) {
  const [state, formAction, isPending] = useActionState(createFocusedRerunAction, idleState<CreateFocusedRerunValues>());

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-md border border-subtle bg-surface p-5">
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="issueIds" value={issuePublicIds.join(",")} />

      <div className="flex items-center gap-2">
        <Icon name="testRuns" size={16} className="text-foreground-muted" />
        <h3 className="text-title-md text-foreground">Create focused rerun</h3>
      </div>
      <p className="text-body-sm text-foreground-muted">
        Retests {issuePublicIds.length === 1 ? "the origin test case" : `the origin test cases for ${issuePublicIds.length} issues`}{" "}
        against a new build.
      </p>

      {state.status === "error" && state.formError ? (
        <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">{state.formError}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Build / release"
          name="build"
          required
          placeholder="1.4.0-rc.2"
          defaultValue={state.values?.build ?? defaultBuild}
          error={state.fieldErrors?.build}
        />
        <Select
          label="Environment"
          name="environment"
          options={environmentOptions}
          defaultValue={state.values?.environment || environmentLabel[projectEnvironment]}
          error={state.fieldErrors?.environment}
        />
        <Input
          label="Browser / device"
          name="browser"
          required
          placeholder="Chrome 128"
          defaultValue={state.values?.browser ?? defaultBrowser}
          error={state.fieldErrors?.browser}
        />
        <Input
          label="Assignee"
          name="assigneeName"
          placeholder="Who's running this?"
          description="Optional — defaults to you."
          defaultValue={state.values?.assigneeName}
          error={state.fieldErrors?.assigneeName}
        />
      </div>

      <div>
        <Button type="submit" intent="primary" loading={isPending}>
          <Icon name="testRuns" size={16} />
          <span>Create rerun</span>
        </Button>
      </div>
    </form>
  );
}
