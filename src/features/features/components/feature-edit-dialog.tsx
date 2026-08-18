"use client";

import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { editFeatureAction } from "@/features/features/actions";
import { idleState } from "@/lib/forms/action-state";
import type { Feature } from "@/types/domain";

export type FeatureEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  feature: Feature;
  onSaved?: () => void;
};

const riskOptions = [
  { value: "low", label: "Low risk" },
  { value: "medium", label: "Medium risk" },
  { value: "high", label: "High risk" },
] as const;

/**
 * The human "edit" action from Phase 4's review set. Uses the same
 * `featureEditFormSchema` the MCP-facing schemas share the risk enum with,
 * and — per 03-CLAUDE-RULES.md "Preserve user input after recoverable
 * failure" — a validation error re-renders with everything the user typed.
 */
export function FeatureEditDialog({ open, onOpenChange, projectSlug, feature, onSaved }: FeatureEditDialogProps) {
  const [state, formAction, isPending] = useActionState(editFeatureAction, idleState());

  useEffect(() => {
    if (state.status === "success") {
      onOpenChange(false);
      onSaved?.();
    }
    // Only react to a fresh success — not to `onOpenChange`/`onSaved` identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Edit ${feature.publicId}`} description={feature.name} className="max-w-xl">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="projectSlug" value={projectSlug} />
          <input type="hidden" name="featureId" value={feature.publicId} />

          {state.status === "error" && state.formError ? (
            <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">
              {state.formError}
            </div>
          ) : null}

          <Input
            name="name"
            label="Name"
            required
            defaultValue={state.values?.name ?? feature.name}
            error={state.fieldErrors?.name}
          />
          <Textarea
            name="description"
            label="Description"
            required
            rows={3}
            defaultValue={state.values?.description ?? feature.description}
            error={state.fieldErrors?.description}
          />
          <Select
            name="risk"
            label="Risk"
            options={riskOptions}
            defaultValue={state.values?.risk ?? feature.risk}
          />
          <Textarea
            name="acceptanceCriteria"
            label="Acceptance criteria"
            description="One statement per line."
            required
            rows={4}
            defaultValue={state.values?.acceptanceCriteria ?? feature.acceptanceCriteria.join("\n")}
            error={state.fieldErrors?.acceptanceCriteria}
          />
          <Input
            name="roles"
            label="Roles"
            description="Comma-separated. Leave blank if this feature doesn't vary by role."
            defaultValue={state.values?.roles ?? feature.roles.join(", ")}
          />
          <Input
            name="dependencies"
            label="Dependencies"
            description="Comma-separated feature public IDs, e.g. FEAT-01, FEAT-02."
            defaultValue={state.values?.dependencies ?? feature.dependencies.join(", ")}
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
