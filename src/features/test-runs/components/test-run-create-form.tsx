"use client";

import * as React from "react";
import { useActionState } from "react";

import { PriorityMark } from "@/components/shared/priority-mark";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/ui/icon";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { testCaseStatuses } from "@/config/status.config";
import { createTestRunAction, type CreateTestRunValues } from "@/features/test-runs/actions";
import { idleState } from "@/lib/forms/action-state";
import { parseCommaIds } from "@/features/test-runs/schemas";
import type { Feature, ProjectEnvironment, TestCase } from "@/types/domain";

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

export type TestRunCreateFormProps = {
  projectSlug: string;
  projectEnvironment: ProjectEnvironment;
  testCases: readonly TestCase[];
  features: readonly Feature[];
  preselectedTestCaseIds: readonly string[];
};

/**
 * The focused create-run flow (Phase 6 Build: "Build/release, environment,
 * browser/device, selection, assignee"). Test cases are grouped by feature —
 * the same visual chain Phase 5's record table preserves — with checkboxes
 * pre-checked from a Test Cases bulk "Add to run" handoff.
 */
export function TestRunCreateForm({
  projectSlug,
  projectEnvironment,
  testCases,
  features,
  preselectedTestCaseIds,
}: TestRunCreateFormProps) {
  const [state, formAction, isPending] = useActionState(createTestRunAction, idleState<CreateTestRunValues>());

  const validPreselected = React.useMemo(
    () => preselectedTestCaseIds.filter((id) => testCases.some((tc) => tc.publicId === id)),
    [preselectedTestCaseIds, testCases],
  );
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(
    () => new Set(state.values?.testCaseIds ? parseCommaIds(state.values.testCaseIds) : validPreselected),
  );

  function toggle(publicId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(publicId);
      else next.delete(publicId);
      return next;
    });
  }

  function toggleGroup(groupIds: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of groupIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const groups = features
    .map((feature) => ({ feature, cases: testCases.filter((tc) => tc.featureId === feature.id) }))
    .filter((group) => group.cases.length > 0);
  const unresolved = testCases.filter((tc) => !features.some((f) => f.id === tc.featureId));

  return (
    <form action={formAction} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="testCaseIds" value={Array.from(selected).join(",")} />

      {state.formError ? (
        <p role="alert" className="rounded-sm border border-fail/30 bg-fail/10 px-3.5 py-2.5 text-body-sm text-fail">
          {state.formError}
        </p>
      ) : null}

      <section className="flex flex-col gap-5">
        <h2 className="text-title-md text-foreground">Run details</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Run name"
            name="name"
            required
            placeholder="Release Candidate 2"
            defaultValue={state.values?.name}
            error={state.fieldErrors?.name}
            containerClassName="sm:col-span-2"
          />
          <Input
            label="Build / release"
            name="build"
            required
            placeholder="1.4.0-rc.2"
            defaultValue={state.values?.build}
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
            defaultValue={state.values?.browser}
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
          <Textarea
            label="Notes"
            name="notes"
            rows={2}
            description="Optional context for whoever executes this run."
            defaultValue={state.values?.notes}
            error={state.fieldErrors?.notes}
            containerClassName="sm:col-span-2"
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-title-md text-foreground">Select test cases</h2>
          <span className="text-body-sm text-foreground-muted">{selected.size} selected</span>
        </div>
        {state.fieldErrors?.testCaseIds ? (
          <p role="alert" className="text-body-sm text-fail">
            {state.fieldErrors.testCaseIds}
          </p>
        ) : null}

        {testCases.length === 0 ? (
          <p className="rounded-md border border-dashed border-subtle p-6 text-center text-body-sm text-foreground-muted">
            No test cases available yet. Generate coverage from the Test Cases tab first.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map(({ feature, cases }) => {
              const groupIds = cases.map((tc) => tc.publicId);
              const allSelected = groupIds.every((id) => selected.has(id));
              const someSelected = groupIds.some((id) => selected.has(id));

              return (
                <div key={feature.id} className="flex flex-col gap-2 overflow-hidden rounded-lg border border-subtle bg-surface">
                  <div className="flex items-center justify-between gap-3 border-b border-subtle bg-inset/40 px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        label={`Select all test cases for ${feature.name}`}
                        hideLabel
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={(checked) => toggleGroup(groupIds, checked === true)}
                      />
                      <span className="text-label-style text-foreground-muted">
                        {feature.publicId} — {feature.name}
                      </span>
                    </div>
                    <span className="text-mono-sm text-foreground-muted">({cases.length})</span>
                  </div>
                  <div className="flex flex-col divide-y divide-subtle">
                    {cases.map((testCase) => (
                      <label
                        key={testCase.id}
                        className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-fast hover:bg-inset/30"
                      >
                        <Checkbox
                          label={`Select ${testCase.publicId}`}
                          hideLabel
                          className="mt-0.5"
                          checked={selected.has(testCase.publicId)}
                          onCheckedChange={(checked) => toggle(testCase.publicId, checked === true)}
                        />
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-mono-sm font-semibold text-foreground-muted">{testCase.publicId}</span>
                            <span className="text-body-sm font-medium text-foreground">{testCase.title}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <PriorityMark priority={testCase.priority} />
                            <StatusBadge status={testCaseStatuses[testCase.status]} />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {unresolved.length > 0 ? (
              <div className="flex flex-col divide-y divide-subtle rounded-lg border border-subtle bg-surface">
                {unresolved.map((testCase) => (
                  <label key={testCase.id} className="flex cursor-pointer items-start gap-3 px-4 py-3">
                    <Checkbox
                      label={`Select ${testCase.publicId}`}
                      hideLabel
                      checked={selected.has(testCase.publicId)}
                      onCheckedChange={(checked) => toggle(testCase.publicId, checked === true)}
                    />
                    <span className="text-body-sm text-foreground">{testCase.publicId} — {testCase.title}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3 border-t border-subtle pt-6">
        <Button type="submit" size="lg" loading={isPending} disabled={selected.size === 0}>
          <Icon name="testRuns" size={16} />
          <span>
            Create run{selected.size > 0 ? ` with ${selected.size} test case${selected.size === 1 ? "" : "s"}` : ""}
          </span>
        </Button>
      </div>
    </form>
  );
}
