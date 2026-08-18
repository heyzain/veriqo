"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { mergeFeaturesAction } from "@/features/features/actions";
import { idleState } from "@/lib/forms/action-state";
import type { Feature } from "@/types/domain";

export type FeatureMergeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  /** The feature being folded away — archived once the merge completes. */
  feature: Feature;
  /** Other non-archived features it could be merged into, most-likely match first. */
  candidates: readonly Feature[];
  onMerged?: () => void;
};

/**
 * The "merge" action from Phase 4's review set — resolves a possible
 * duplicate by folding `feature` into whichever survivor the human confirms.
 * `feature-service.mergeFeatures` unions acceptance criteria/roles/source
 * references and re-points any test cases or issues so nothing dangles.
 */
export function FeatureMergeDialog({
  open,
  onOpenChange,
  projectSlug,
  feature,
  candidates,
  onMerged,
}: FeatureMergeDialogProps) {
  const [state, formAction, isPending] = useActionState(mergeFeaturesAction, idleState());
  // Lazy initial state only — this dialog is unmounted on close (its parent
  // renders it conditionally), so a fresh instance already picks up the
  // current `candidates` on mount without needing to resync via an effect.
  const [survivorId, setSurvivorId] = useState(() => candidates[0]?.publicId ?? "");

  useEffect(() => {
    if (state.status === "success") {
      onOpenChange(false);
      onMerged?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Merge ${feature.publicId}`}
        description={`${feature.name} will be archived and its content combined into the feature you keep.`}
      >
        {candidates.length === 0 ? (
          <p className="text-body-sm text-foreground-muted">
            No other active features to merge this into yet.
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="projectSlug" value={projectSlug} />
            <input type="hidden" name="mergedFeatureId" value={feature.publicId} />

            {state.status === "error" && state.formError ? (
              <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">
                {state.formError}
              </div>
            ) : null}

            <Select
              name="survivorFeatureId"
              label="Keep this feature"
              description="Acceptance criteria, roles, and source references from both are combined onto it."
              value={survivorId}
              onValueChange={setSurvivorId}
              options={candidates.map((c) => ({ value: c.publicId, label: `${c.publicId} — ${c.name}` }))}
            />

            <DialogFooter>
              <Button type="button" intent="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" intent="primary" disabled={isPending || !survivorId}>
                {isPending ? "Merging…" : `Merge into ${survivorId || "…"}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
