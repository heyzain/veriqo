"use client";

import { useEffect, useRef, useTransition } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FeatureDiscoveryPanel } from "@/features/features/components/feature-discovery-panel";
import { requestFeatureRegenerationAction } from "@/features/features/actions";
import type { FeatureDiscoveryContext } from "@/prompts/feature-discovery/prompt";

export type FeatureRegenerateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectSlug: string;
  featureId: string;
  context: FeatureDiscoveryContext;
};

/**
 * The "Regenerate" action from Phase 4's "Approve, edit, merge, archive,
 * regenerate" set — opens a prompt scoped to one feature via
 * `FeatureDiscoveryPanel`'s `focusFeature` mode. The regeneration itself
 * only happens once Claude calls `update_feature`; this dialog just composes
 * the prompt and records that a human asked for it.
 */
export function FeatureRegenerateDialog({
  open,
  onOpenChange,
  projectSlug,
  featureId,
  context,
}: FeatureRegenerateDialogProps) {
  const [, startTransition] = useTransition();
  const logged = useRef(false);

  useEffect(() => {
    if (open && !logged.current) {
      logged.current = true;
      startTransition(() => {
        requestFeatureRegenerationAction(projectSlug, featureId);
      });
    }
    if (!open) logged.current = false;
  }, [open, projectSlug, featureId, startTransition]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Regenerate ${featureId}`}
        description="Ask Claude to re-analyze just this feature and update its record."
        className="max-w-2xl"
      >
        <FeatureDiscoveryPanel projectSlug={projectSlug} context={context} />
      </DialogContent>
    </Dialog>
  );
}
