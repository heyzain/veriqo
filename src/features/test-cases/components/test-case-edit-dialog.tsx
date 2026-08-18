"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { editTestCaseAction } from "@/features/test-cases/actions";
import { idleState } from "@/lib/forms/action-state";
import type { TestCase } from "@/types/domain";

export type TestCaseEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  testCase: TestCase;
  onSaved?: () => void;
};

const priorityOptions = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

/**
 * The human "edit" action from Phase 5's review set — mirrors
 * `FeatureEditDialog`. A validation error re-renders with everything the
 * user typed (03-CLAUDE-RULES.md, "Preserve user input after recoverable
 * failure").
 */
export function TestCaseEditDialog({ open, onOpenChange, projectSlug, testCase, onSaved }: TestCaseEditDialogProps) {
  const [state, formAction, isPending] = useActionState(editTestCaseAction, idleState());

  useEffect(() => {
    if (state.status === "success") {
      onOpenChange(false);
      onSaved?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Edit ${testCase.publicId}`} description={testCase.title} className="max-w-xl">
        <form action={formAction} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="testCaseId" value={testCase.publicId} />

          {state.status === "error" && state.formError ? (
            <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">
              {state.formError}
            </div>
          ) : null}

          <Input
            name="title"
            label="Title"
            required
            defaultValue={state.values?.title ?? testCase.title}
            error={state.fieldErrors?.title}
          />
          <Select
            name="priority"
            label="Priority"
            options={priorityOptions}
            defaultValue={state.values?.priority ?? testCase.priority}
          />
          <Textarea
            name="preconditions"
            label="Preconditions"
            description="Any required starting state. Leave blank if none."
            rows={2}
            defaultValue={state.values?.preconditions ?? testCase.preconditions ?? ""}
          />
          <Textarea
            name="steps"
            label="Steps"
            description="One step per line."
            required
            rows={5}
            defaultValue={state.values?.steps ?? testCase.steps.join("\n")}
            error={state.fieldErrors?.steps}
          />
          <Textarea
            name="expectedResult"
            label="Expected result"
            required
            rows={2}
            defaultValue={state.values?.expectedResult ?? testCase.expectedResult}
            error={state.fieldErrors?.expectedResult}
          />
          <Input
            name="roles"
            label="Roles"
            description="Comma-separated. Leave blank if this case doesn't vary by role."
            defaultValue={state.values?.roles ?? testCase.roles.join(", ")}
          />
          <Input
            name="environments"
            label="Environments"
            description="Comma-separated, e.g. Chrome, Mobile Safari. Leave blank if environment-independent."
            defaultValue={state.values?.environments ?? testCase.environments.join(", ")}
          />

          <DialogFooter>
            <Button type="button" intent="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" intent="primary" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
