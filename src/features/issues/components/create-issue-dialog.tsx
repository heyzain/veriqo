"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createIssueAction, type CreateIssueValues } from "@/features/issues/actions";
import { idleState } from "@/lib/forms/action-state";
import type { RiskLevel } from "@/types/domain";

export type CreateIssueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  testRunPublicId: string;
  testCasePublicId: string;
  defaultTitle: string;
  defaultSeverity: RiskLevel;
};

const severityOptions = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

/**
 * The "Create issue" entry point from a failed/partial/blocked result row on
 * the Test Run detail page (Phase 7 Build: "Create issue from failed
 * result"). Redirects straight to the new issue's detail page on success —
 * the natural next step is investigating it.
 */
export function CreateIssueDialog({
  open,
  onOpenChange,
  projectSlug,
  testRunPublicId,
  testCasePublicId,
  defaultTitle,
  defaultSeverity,
}: CreateIssueDialogProps) {
  const [state, formAction, isPending] = useActionState(createIssueAction, idleState<CreateIssueValues>());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Create issue"
        description={`From the failed result on ${testCasePublicId} in ${testRunPublicId}.`}
        className="max-w-md"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="testRunId" value={testRunPublicId} />
          <input type="hidden" name="testCaseId" value={testCasePublicId} />

          {state.status === "error" && state.formError ? (
            <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">
              {state.formError}
            </div>
          ) : null}

          <Input
            name="title"
            label="Title"
            required
            defaultValue={state.values?.title ?? defaultTitle}
            error={state.fieldErrors?.title}
          />
          <Select
            name="severity"
            label="Severity"
            options={severityOptions}
            defaultValue={state.values?.severity ?? defaultSeverity}
          />

          <DialogFooter>
            <Button type="button" intent="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" intent="primary" disabled={isPending}>
              {isPending ? "Creating…" : "Create issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
